import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { LedgerEntry } from '../transaction/entities/ledger-entry.entity';
import { WalletType, EntityStatus, LedgerEntryType } from '../common/enums';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new wallet for an owner entity.
   */
  async createWallet(
    ownerType: string,
    ownerId: string,
    walletType: WalletType,
    currency = 'KZT',
  ): Promise<Wallet> {
    const wallet = this.walletRepo.create({
      owner_type: ownerType,
      owner_id: ownerId,
      wallet_type: walletType,
      currency,
      balance_cached: 0,
      status: EntityStatus.ACTIVE,
    });
    return this.walletRepo.save(wallet);
  }

  /**
   * Get the cached balance for a wallet.
   */
  async getBalance(walletId: string): Promise<{ balance: number; currency: string }> {
    const wallet = await this.findById(walletId);
    return {
      balance: Number(wallet.balance_cached),
      currency: wallet.currency,
    };
  }

  /**
   * Return all wallets belonging to a customer (owner_type = 'customer').
   */
  async getCustomerWallets(customerId: string): Promise<Wallet[]> {
    const wallets = await this.walletRepo.find({
      where: { owner_id: customerId, owner_type: 'customer' },
    });
    // Ensure numeric balance
    return wallets.map((w) => ({ ...w, balance_cached: Number(w.balance_cached) }));
  }

  /**
   * Find a wallet by its ID or throw.
   */
  async findById(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) {
      throw new NotFoundException(`Wallet ${walletId} not found`);
    }
    wallet.balance_cached = Number(wallet.balance_cached);
    return wallet;
  }

  /**
   * Recalculate balance_cached from ledger_entries (source of truth).
   * Credits increase balance, debits decrease it.
   */
  async updateCachedBalance(walletId: string): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder(LedgerEntry, 'le')
        .select(
          `COALESCE(SUM(CASE WHEN le.entry_type = :credit THEN le.amount ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN le.entry_type = :debit THEN le.amount ELSE 0 END), 0)`,
          'balance',
        )
        .where('le.wallet_id = :walletId', { walletId })
        .setParameters({
          credit: LedgerEntryType.CREDIT,
          debit: LedgerEntryType.DEBIT,
        })
        .getRawOne();

      const newBalance = Number(result?.balance ?? 0);

      await manager.update(Wallet, walletId, { balance_cached: newBalance });

      const wallet = await manager.findOne(Wallet, { where: { id: walletId } });
      if (!wallet) {
        throw new NotFoundException(`Wallet ${walletId} not found`);
      }
      wallet.balance_cached = Number(wallet.balance_cached);
      return wallet;
    });
  }
}
