import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuthUser } from '../common/current-user.decorator';
import { Paginated, paginate } from '../common/pagination.dto';

export interface AuditQuery {
  entityType?: string;
  userId?: string;
}

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

  // Module 14: "все действия пользователей фиксируются в журнале действий"
  // implied a way to actually read it back — director-only, see
  // AuditController.
  async findAllPaginated(query: AuditQuery, page: number, pageSize: number): Promise<Paginated<AuditLog>> {
    const qb = this.repo.createQueryBuilder('log');
    if (query.entityType) qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    if (query.userId) qb.andWhere('log.userId = :userId', { userId: query.userId });

    const [items, total] = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginate(items, total, page, pageSize);
  }
}
