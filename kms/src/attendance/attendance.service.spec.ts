import { AttendanceService } from './attendance.service';
import { AttendanceEventType } from './attendance-record.entity';
import { Role } from '../common/roles.enum';

describe('AttendanceService.recordScan', () => {
  const actingUser = { userId: 'teacher-1', email: 't@example.com', role: Role.TEACHER };

  function makeService(existingRecords: Array<{ eventType: AttendanceEventType }>) {
    const saved: unknown[] = [];
    const repo = {
      find: jest.fn().mockResolvedValue(existingRecords),
      create: jest.fn((data) => data),
      save: jest.fn((data) => {
        saved.push(data);
        return Promise.resolve(data);
      }),
    };
    const notificationsService = { notifyParentsOfChild: jest.fn().mockResolvedValue(undefined) };
    const childrenService = {};
    const service = new AttendanceService(repo as any, childrenService as any, notificationsService as any);
    return { service, repo, saved, notificationsService };
  }

  it('records a check-in when there are no events yet today', async () => {
    const { service, saved } = makeService([]);
    const record = await service.recordScan('child-1', actingUser);
    expect(record.eventType).toBe(AttendanceEventType.CHECK_IN);
    expect(saved).toHaveLength(1);
  });

  it('records a check-out when the last event today was a check-in', async () => {
    const { service } = makeService([{ eventType: AttendanceEventType.CHECK_IN }]);
    const record = await service.recordScan('child-1', actingUser);
    expect(record.eventType).toBe(AttendanceEventType.CHECK_OUT);
  });

  it('records a fresh check-in when the last event today was a check-out', async () => {
    const { service } = makeService([
      { eventType: AttendanceEventType.CHECK_IN },
      { eventType: AttendanceEventType.CHECK_OUT },
    ]);
    const record = await service.recordScan('child-1', actingUser);
    expect(record.eventType).toBe(AttendanceEventType.CHECK_IN);
  });

  it('never lets a notification failure reject the scan', async () => {
    const { service, notificationsService } = makeService([]);
    notificationsService.notifyParentsOfChild.mockRejectedValue(new Error('SMTP down'));
    await expect(service.recordScan('child-1', actingUser)).resolves.toBeDefined();
  });
});
