import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuthUser } from '../common/current-user.decorator';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async record(
    user: AuthUser | undefined,
    action: string,
    entityType: string,
    entityId: string | null,
    details?: object,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        userId: user?.userId ?? null,
        userEmail: user?.email ?? null,
        action,
        entityType,
        entityId,
        details: (details as Record<string, unknown>) ?? null,
      }),
    );
  }
}
