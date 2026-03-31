import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from '../../wallet/entities/wallet.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Entity('bonus_lots')
export class BonusLot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customer_wallet_id: string;

  @Column({ type: 'uuid' })
  source_transaction_id: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount_remaining: number;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'customer_wallet_id' })
  customer_wallet: Wallet;

  @ManyToOne(() => Transaction)
  @JoinColumn({ name: 'source_transaction_id' })
  source_transaction: Transaction;
}
