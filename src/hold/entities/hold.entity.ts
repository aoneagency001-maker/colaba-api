import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { HoldStatus } from '../../common/enums';
import { Wallet } from '../../wallet/entities/wallet.entity';

@Entity('holds')
export class Hold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  wallet_id: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: HoldStatus, default: HoldStatus.ACTIVE })
  status: HoldStatus;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'uuid', nullable: true })
  transaction_draft_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;
}
