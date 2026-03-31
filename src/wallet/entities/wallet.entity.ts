import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityStatus, WalletType } from '../../common/enums';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  owner_type: string; // 'customer' | 'company' | 'system'

  @Column({ type: 'uuid' })
  owner_id: string;

  @Column({ type: 'enum', enum: WalletType })
  wallet_type: WalletType;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  balance_cached: number;

  @Column({ length: 3, default: 'KZT' })
  currency: string;

  @Column({ type: 'enum', enum: EntityStatus, default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
