import { ChargesService } from './charges.service';
import { ChargeType } from './charge.entity';
import { ChildStatus } from '../children/child.entity';

describe('ChargesService.accrueMonthlyForGroup', () => {
  function makeService(children: Array<{ id: string; groupId: string | null }>, tariff: unknown) {
    const saved: unknown[] = [];
    const repo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => {
        saved.push(data);
        return Promise.resolve({ id: `charge-${saved.length}`, ...data });
      }),
    };
    const childrenService = { findAll: jest.fn().mockResolvedValue(children) };
    const tariffsService = { resolveForChild: jest.fn().mockResolvedValue(tariff) };
    const service = new ChargesService(repo as any, childrenService as any, tariffsService as any);
    return { service, repo, saved, childrenService, tariffsService };
  }

  it('only looks at active children in the given group', async () => {
    const { service, childrenService } = makeService([], null);
    await service.accrueMonthlyForGroup('group-1', '2024-09-01');
    expect(childrenService.findAll).toHaveBeenCalledWith({ groupId: 'group-1', status: ChildStatus.ACTIVE });
  });

  it('skips a child with no resolvable tariff rather than guessing an amount', async () => {
    const { service, saved } = makeService([{ id: 'child-1', groupId: 'group-1' }], null);
    const result = await service.accrueMonthlyForGroup('group-1', '2024-09-01');
    expect(result).toHaveLength(0);
    expect(saved).toHaveLength(0);
  });

  it('creates one monthly_tariff charge per child using the resolved tariff amount', async () => {
    const children = [
      { id: 'child-1', groupId: 'group-1' },
      { id: 'child-2', groupId: 'group-1' },
    ];
    const { service, saved } = makeService(children, { amount: '8000.00' });

    const result = await service.accrueMonthlyForGroup('group-1', '2024-09-01');

    expect(result).toHaveLength(2);
    expect(saved.every((c: any) => c.type === ChargeType.MONTHLY_TARIFF)).toBe(true);
    expect(saved.every((c: any) => c.amount === '8000.00')).toBe(true);
    expect(saved.every((c: any) => c.dueDate === '2024-09-01')).toBe(true);
  });
});
