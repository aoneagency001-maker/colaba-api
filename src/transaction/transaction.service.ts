import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import {
  TransactionStatus,
  TransactionType,
  LedgerEntryType,
  EntityStatus,
} from '../common/enums';
import { CreateTransactionDto, QuoteTransactionDto } from './dto/create-transaction.dto';
import { v4 as uuidv4 } from 'uuid';

export interface TransactionQuote {
  amount: number;
  currency: string;
  source_wallet_id: string;
  target_wallet_id: string;
  source_balance: number;
  sufficient_funds: boolean;
}

export interface TransactionHistoryFilter {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
}

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerRepo: Repository<LedgerEntry>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Pre-calculate a transaction quote. No mutations.
   */
  async quote(dto: QuoteTransactionDto): Promise<TransactionQuote> {
    const sourceWallet = await this.walletRepo.findOne({
      where: { id: dto.source_wallet_id },
    });
    if (!sourceWallet) {
      throw new NotFoundException(`Source wallet ${dto.source_wallet_id} not found`);
    }

    const targetWallet = await this.walletRepo.findOne({
      where: { id: dto.target_wallet_id },
    });
    if (!targetWallet) {
      throw new NotFoundException(`Target wallet ${dto.target_wallet_id} not found`);
    }

    const sourceBalance = Number(sourceWallet.balance_cached);

    return {
      amount: dto.amount,
      currency: dto.currency,
      source_wallet_id: dto.source_wallet_id,
      target_wallet_id: dto.target_wallet_id,
      source_balance: sourceBalance,
      sufficient_funds: sourceBalance >= dto.amount,
    };
  }

  /**
   * Create a transaction with double-entry ledger entries. Fully atomic.
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    if (dto.source_wallet_id === dto.target_wallet_id) {
      throw new BadRequestException('Source and target wallets must be different');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Idempotency check
      const existing = await manager.findOne(Transaction, {
        where: { idempotency_key: dto.idempotency_key },
      });
      if (existing) {
        throw new ConflictException(
          `Transaction with idempotency_key "${dto.idempotency_key}" already exists`,
        );
      }

      // 2. Lock and load wallets in deterministic order to prevent deadlocks
      const [firstId, secondId] = [dto.source_wallet_id, dto.target_wallet_id].sort();

      const firstWallet = await manager
        .createQueryBuilder(Wallet, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: firstId })
        .getOne();

      const secondWallet = await manager
        .createQueryBuilder(Wallet, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: secondId })
        .getOne();

      const sourceWallet = firstId === dto.source_wallet_id ? firstWallet : secondWallet;
      const targetWallet = firstId === dto.target_wallet_id ? firstWallet : secondWallet;

      if (!sourceWallet) {
        throw new NotFoundException(`Source wallet ${dto.source_wallet_id} not found`);
      }
      if (sourceWallet.status !== EntityStatus.ACTIVE) {
        throw new BadRequestException(`Source wallet ${dto.source_wallet_id} is not active`);
      }

      if (!targetWallet) {
        throw new NotFoundException(`Target wallet ${dto.target_wallet_id} not found`);
      }
      if (targetWallet.status !== EntityStatus.ACTIVE) {
        throw new BadRequestException(`Target wallet ${dto.target_wallet_id} is not active`);
      }

      // 3. Check sufficient balance on source wallet (debits)
      const sourceBalance = Number(sourceWallet.balance_cached);
      if (sourceBalance < dto.amount) {
        throw new BadRequestException(
          `Insufficient balance on source wallet. Available: ${sourceBalance}, required: ${dto.amount}`,
        );
      }

      // 4. Create Transaction record
      const tx = manager.create(Transaction, {
        type: dto.type,
        status: TransactionStatus.CONFIRMED,
        amount: dto.amount,
        currency: dto.currency,
        source_wallet_id: dto.source_wallet_id,
        target_wallet_id: dto.target_wallet_id,
        idempotency_key: dto.idempotency_key,
        description: dto.description ?? null,
        meta_json: dto.meta_json ?? null,
        reference_transaction_id: null,
      });
      const savedTx = await manager.save(Transaction, tx);

      // 5. Create double-entry ledger records
      const debitEntry = manager.create(LedgerEntry, {
        transaction_id: savedTx.id,
        wallet_id: dto.source_wallet_id,
        entry_type: LedgerEntryType.DEBIT,
        amount: dto.amount,
      });

      const creditEntry = manager.create(LedgerEntry, {
        transaction_id: savedTx.id,
        wallet_id: dto.target_wallet_id,
        entry_type: LedgerEntryType.CREDIT,
        amount: dto.amount,
      });

      await manager.save(LedgerEntry, [debitEntry, creditEntry]);

      // 6. Update cached balances
      const newSourceBalance = sourceBalance - dto.amount;
      const newTargetBalance = Number(targetWallet.balance_cached) + dto.amount;

      await manager.update(Wallet, dto.source_wallet_id, {
        balance_cached: newSourceBalance,
      });
      await manager.update(Wallet, dto.target_wallet_id, {
        balance_cached: newTargetBalance,
      });

      return savedTx;
    });
  }

  /**
   * Reverse a confirmed transaction by creating a counter-transaction.
   */
  async reverse(transactionId: string, actorUserId: string, reason?: string): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Find original
      const original = await manager.findOne(Transaction, {
        where: { id: transactionId },
      });
      if (!original) {
        throw new NotFoundException(`Transaction ${transactionId} not found`);
      }
      if (original.status === TransactionStatus.REVERSED) {
        throw new BadRequestException(`Transaction ${transactionId} is already reversed`);
      }
      if (original.status !== TransactionStatus.CONFIRMED && original.status !== TransactionStatus.SETTLED) {
        throw new BadRequestException(
          `Only confirmed or settled transactions can be reversed. Current status: ${original.status}`,
        );
      }

      // 2. Lock wallets in deterministic order to prevent deadlocks
      const [firstId, secondId] = [original.target_wallet_id, original.source_wallet_id].sort();

      const firstWallet = await manager
        .createQueryBuilder(Wallet, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: firstId })
        .getOne();

      const secondWallet = await manager
        .createQueryBuilder(Wallet, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: secondId })
        .getOne();

      // sourceWallet = original target (reversal debits from here)
      // targetWallet = original source (reversal credits here)
      const sourceWallet = firstId === original.target_wallet_id ? firstWallet : secondWallet;
      const targetWallet = firstId === original.source_wallet_id ? firstWallet : secondWallet;

      if (!sourceWallet || !targetWallet) {
        throw new NotFoundException('One of the wallets from the original transaction was not found');
      }

      // Check that the reversal source (original target) has enough balance
      const reversalSourceBalance = Number(sourceWallet.balance_cached);
      if (reversalSourceBalance < Number(original.amount)) {
        throw new BadRequestException(
          `Insufficient balance for reversal. Available: ${reversalSourceBalance}, required: ${Number(original.amount)}`,
        );
      }

      // 3. Create reversal transaction (swap source and target)
      const reversalTx = manager.create(Transaction, {
        type: TransactionType.REVERSAL,
        status: TransactionStatus.CONFIRMED,
        amount: Number(original.amount),
        currency: original.currency,
        source_wallet_id: original.target_wallet_id,
        target_wallet_id: original.source_wallet_id,
        idempotency_key: `reversal_${original.id}_${uuidv4()}`,
        reference_transaction_id: original.id,
        description: reason ?? `Reversal of transaction ${original.id} by user ${actorUserId}`,
        meta_json: { reversed_by: actorUserId, original_type: original.type },
      });
      const savedReversal = await manager.save(Transaction, reversalTx);

      // 4. Create opposite ledger entries
      const debitEntry = manager.create(LedgerEntry, {
        transaction_id: savedReversal.id,
        wallet_id: original.target_wallet_id,
        entry_type: LedgerEntryType.DEBIT,
        amount: Number(original.amount),
      });

      const creditEntry = manager.create(LedgerEntry, {
        transaction_id: savedReversal.id,
        wallet_id: original.source_wallet_id,
        entry_type: LedgerEntryType.CREDIT,
        amount: Number(original.amount),
      });

      await manager.save(LedgerEntry, [debitEntry, creditEntry]);

      // 5. Update balances
      await manager.update(Wallet, original.target_wallet_id, {
        balance_cached: reversalSourceBalance - Number(original.amount),
      });
      await manager.update(Wallet, original.source_wallet_id, {
        balance_cached: Number(targetWallet.balance_cached) + Number(original.amount),
      });

      // 6. Mark original as reversed
      await manager.update(Transaction, original.id, {
        status: TransactionStatus.REVERSED,
      });

      return savedReversal;
    });
  }

  /**
   * Get paginated transaction history for a wallet.
   */
  async getHistory(
    walletId: string,
    filters: TransactionHistoryFilter = {},
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.txRepo
      .createQueryBuilder('tx')
      .where('(tx.source_wallet_id = :walletId OR tx.target_wallet_id = :walletId)', {
        walletId,
      })
      .orderBy('tx.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.type) {
      qb.andWhere('tx.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('tx.status = :status', { status: filters.status });
    }

    const [data, total] = await qb.getManyAndCount();

    // Ensure numeric amounts
    const normalised = data.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
    }));

    return { data: normalised as Transaction[], total, page, limit };
  }
}
