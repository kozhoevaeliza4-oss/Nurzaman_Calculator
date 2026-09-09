import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AttendanceRecord, AttendanceEventType } from './attendance-record.entity';
import { ChildrenService } from '../children/children.service';
import { Child, ChildStatus } from '../children/child.entity';
import { AuthUser } from '../common/current-user.decorator';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday(): Date {
  const start = startOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord) private readonly repo: Repository<AttendanceRecord>,
    private readonly childrenService: ChildrenService,
  ) {}

  resolveChildByCode(code: string): Promise<Child> {
    return this.childrenService.findByQrCode(code);
  }

  // Module 5: scanning toggles between arrival and departure — an open
  // check-in (no matching check-out yet today) becomes a check-out,
  // otherwise it's a fresh check-in.
  async recordScan(childId: string, actingUser: AuthUser): Promise<AttendanceRecord> {
    const todaysRecords = await this.repo.find({
      where: { childId, occurredAt: Between(startOfToday(), endOfToday()) },
      order: { occurredAt: 'ASC' },
    });

    const lastEvent = todaysRecords[todaysRecords.length - 1];
    const eventType =
      lastEvent?.eventType === AttendanceEventType.CHECK_IN
        ? AttendanceEventType.CHECK_OUT
        : AttendanceEventType.CHECK_IN;

    return this.repo.save(
      this.repo.create({
        childId,
        eventType,
        occurredAt: new Date(),
        recordedBy: actingUser.userId,
        recordedByRole: actingUser.role,
      }),
    );
  }

  findForChild(childId: string): Promise<AttendanceRecord[]> {
    return this.repo.find({ where: { childId }, order: { occurredAt: 'DESC' } });
  }

  async todayRosterForGroup(groupId: string): Promise<
    Array<{ childId: string; fullName: string; status: 'present' | 'absent'; lastEvent: AttendanceRecord | null }>
  > {
    const children = await this.childrenService.findAll({ groupId, status: ChildStatus.ACTIVE });
    const todaysRecords = await this.repo.find({
      where: { occurredAt: Between(startOfToday(), endOfToday()) },
      order: { occurredAt: 'ASC' },
    });

    return children.map((child) => {
      const childRecords = todaysRecords.filter((record) => record.childId === child.id);
      const lastEvent = childRecords[childRecords.length - 1] ?? null;
      const status = lastEvent?.eventType === AttendanceEventType.CHECK_IN ? 'present' : 'absent';
      return { childId: child.id, fullName: child.fullName, status, lastEvent };
    });
  }
}
