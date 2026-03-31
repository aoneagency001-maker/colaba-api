import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Hold } from './entities/hold.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { HoldStatus, EntityStatus } from '../common/enums';

@Injectable()
export class HoldService {
  constructor(
    @InjectRepository(Hold)
    private readonly holdRepo: Repository<Hold>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a hold on a wallet. Validates balance considering existing active holds.
   */
  async createHold(
    walletId: string,
    amount: number,
    expiresAt: Date,
    transactionDraftId?: string,
  ): Promise<Hold> {
    return this.dataSource.transaction(async (manager) => {
      // Lock wallet
      const wallet = await manager
        .createQueryBuilder(Wallet, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: walletId })
        .getOne();

      if (!wallet) {
        throw new NotFoundException(`Wallet ${walletId} not found`);
      }
      if (wallet.status !== EntityStatus.ACTIVE) {
        throw new BadRequestException(`Wallet ${walletId} is not active`);
      }

      // Calculate available balance (cached balance minus active holds)
      const { sum: activeHoldsSum } = await manager
        .createQueryBuilder(Hold, 'h')
        .select('COALESCE(SUM(h.amount), 0)', 'sum')
        .where('h.wallet_id = :walletId', { walletId })
        .andWhere('h.status = :status', { status: HoldStatus.ACTIVE })
        .getRawOne();

      const available = Number(wallet.balance_cached) - Number(activeHoldsSum);

      if (available < amount) {
        throw new BadRequestException(
          `Insufficient available balance for hold. Available: ${available}, requested: ${amount}`,
        );
      }

      const hold = manager.create(Hold, {
        wallet_id: walletId,
        amount,
        status: HoldStatus.ACTIVE,
        expires_at: expiresAt,
        transaction_draft_id: transactionDraftId ?? null,
      });

      return manager.save(Hold, hold);
    });
  }

  /**
   * Capture a hold — mark it as captured (funds committed).
   */
  async captureHold(holdId: string): Promise<Hold> {
    return this.dataSource.transaction(async (manager) => {
      const hold = await manager.findOne(Hold, { where: { id: holdId } });
      if (!hold) {
        throw new NotFoundException(`Hold ${holdId} not found`);
      }
      if (hold.status !== HoldStatus.ACTIVE) {
        throw new BadRequestException(
          `Hold ${holdId} cannot be captured. Current status: ${hold.status}`,
        );
      }

      hold.status = HoldStatus.CAPTURED;
      return manager.save(Hold, hold);
    });
  }

  /**
   * Release a hold — mark it as released (funds freed).
   */
  async releaseHold(holdId: string): Promise<Hold> {
    return this.dataSource.transaction(async (manager) => {
      const hold = await manager.findOne(Hold, { where: { id: holdId } });
      if (!hold) {
        throw new NotFoundException(`Hold ${holdId} not found`);
      }
      if (hold.status !== HoldStatus.ACTIVE) {
        throw new BadRequestException(
          `Hold ${holdId} cannot be released. Current status: ${hold.status}`,
        );
      }

      hold.status = HoldStatus.RELEASED;
      return manager.save(Hold, hold);
    });
  }

  /**
   * Cron job: expire holds that have passed their expiry date.
   * Runs every 10 minutes.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processExpiredHolds(): Promise<void> {
    const expiredHolds = await this.holdRepo
      .createQueryBuilder('h')
      .where('h.status = :status', { status: HoldStatus.ACTIVE })
      .andWhere('h.expires_at <= :now', { now: new Date() })
      .getMany();

    for (const hold of expiredHolds) {
      try {
        hold.status = HoldStatus.EXPIRED;
        await this.holdRepo.save(hold);
      } catch (err) {
        console.error(`Failed to expire hold ${hold.id}:`, err);
      }
    }
  }
}
