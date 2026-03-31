import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BonusLot } from './entities/bonus-lot.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionType, WalletType } from '../common/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BonusLotService {
  constructor(
    @InjectRepository(BonusLot)
    private readonly lotRepo: Repository<BonusLot>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly transactionService: TransactionService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new bonus lot linked to a source transaction.
   */
  async createLot(
    customerWalletId: string,
    sourceTransactionId: string,
    amount: number,
    expiresAt: Date,
  ): Promise<BonusLot> {
    const lot = this.lotRepo.create({
      customer_wallet_id: customerWalletId,
      source_transaction_id: sourceTransactionId,
      amount_remaining: amount,
      expires_at: expiresAt,
    });
    return this.lotRepo.save(lot);
  }

  /**
   * Get lots that will expire within the given number of days.
   */
  async getExpiringLots(customerWalletId: string, withinDays = 30): Promise<BonusLot[]> {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + withinDays);

    const lots = await this.lotRepo
      .createQueryBuilder('lot')
      .where('lot.customer_wallet_id = :customerWalletId', { customerWalletId })
      .andWhere('lot.amount_remaining > 0')
      .andWhere('lot.expires_at <= :deadline', { deadline })
      .andWhere('lot.expires_at > :now', { now: new Date() })
      .orderBy('lot.expires_at', 'ASC')
      .getMany();

    return lots.map((l) => ({ ...l, amount_remaining: Number(l.amount_remaining) }));
  }

  /**
   * Consume bonus lots in FIFO order (oldest lots first).
   * Returns the list of consumed lots with amounts consumed from each.
   */
  async consumeLots(
    customerWalletId: string,
    amount: number,
  ): Promise<{ lot_id: string; consumed: number }[]> {
    return this.dataSource.transaction(async (manager) => {
      // Get active lots ordered by expiry (FIFO — oldest expire first)
      const lots = await manager
        .createQueryBuilder(BonusLot, 'lot')
        .setLock('pessimistic_write')
        .where('lot.customer_wallet_id = :customerWalletId', { customerWalletId })
        .andWhere('lot.amount_remaining > 0')
        .andWhere('lot.expires_at > :now', { now: new Date() })
        .orderBy('lot.expires_at', 'ASC')
        .getMany();

      let remaining = amount;
      const consumed: { lot_id: string; consumed: number }[] = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const lotBalance = Number(lot.amount_remaining);
        const toConsume = Math.min(lotBalance, remaining);

        await manager.update(BonusLot, lot.id, {
          amount_remaining: lotBalance - toConsume,
        });

        consumed.push({ lot_id: lot.id, consumed: toConsume });
        remaining -= toConsume;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          `Insufficient bonus lots. Could not consume ${remaining} of ${amount} requested.`,
        );
      }

      return consumed;
    });
  }

  /**
   * Cron job: find expired lots and create burn transactions.
   * Runs daily at 02:00.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processExpiredLots(): Promise<void> {
    const expiredLots = await this.lotRepo
      .createQueryBuilder('lot')
      .where('lot.amount_remaining > 0')
      .andWhere('lot.expires_at <= :now', { now: new Date() })
      .getMany();

    for (const lot of expiredLots) {
      try {
        const lotAmount = Number(lot.amount_remaining);
        if (lotAmount <= 0) continue;

        // Find the customer's wallet
        const customerWallet = await this.walletRepo.findOne({
          where: { id: lot.customer_wallet_id },
        });
        if (!customerWallet) continue;

        // Find the system burn wallet
        const burnWallet = await this.walletRepo.findOne({
          where: {
            wallet_type: WalletType.BURN,
          },
        });
        if (!burnWallet) continue;

        // Create a burn transaction
        await this.transactionService.create({
          type: TransactionType.BURN,
          amount: lotAmount,
          currency: customerWallet.currency,
          source_wallet_id: lot.customer_wallet_id,
          target_wallet_id: burnWallet.id,
          idempotency_key: `burn_lot_${lot.id}_${uuidv4()}`,
          description: `Bonus lot ${lot.id} expired`,
        });

        // Zero out the lot
        await this.lotRepo.update(lot.id, { amount_remaining: 0 });
      } catch (err) {
        // Log but don't fail the whole batch
        console.error(`Failed to process expired lot ${lot.id}:`, err);
      }
    }
  }
}
