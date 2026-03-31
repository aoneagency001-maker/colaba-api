import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  actor_user_id: string | null;

  @Column()
  entity_type: string;

  @Column({ type: 'uuid' })
  entity_id: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  meta_json: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;
}
