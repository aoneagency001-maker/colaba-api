import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    actorUserId: string | null,
    entityType: string,
    entityId: string,
    action: string,
    meta?: Record<string, any>,
  ): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      actor_user_id: actorUserId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      meta_json: meta ?? null,
    });
    return this.auditRepo.save(entry);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entity_type: entityType, entity_id: entityId },
      order: { created_at: 'DESC' },
    });
  }
}
