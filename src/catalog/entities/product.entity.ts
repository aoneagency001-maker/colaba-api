import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';

export enum BonusType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  composition: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  unit: string | null;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ type: 'enum', enum: BonusType, default: BonusType.PERCENT })
  bonusType: BonusType;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  bonusValue: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 1 })
  bonusMultiplier: number;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
