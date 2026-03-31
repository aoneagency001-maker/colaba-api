import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionType, TransactionStatus } from '../../common/enums';
import { Wallet } from '../../wallet/entities/wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.DRAFT })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'uuid' })
  source_wallet_id: string;

  @Column({ type: 'uuid' })
  target_wallet_id: string;

  @Column({ unique: true })
  idempotency_key: string;

  @Column({ type: 'uuid', nullable: true })
  reference_transaction_id: string | null;

  @Column({ nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  meta_json: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'source_wallet_id' })
  source_wallet: Wallet;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'target_wallet_id' })
  target_wallet: Wallet;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'reference_transaction_id' })
  reference_transaction: Transaction | null;
}
