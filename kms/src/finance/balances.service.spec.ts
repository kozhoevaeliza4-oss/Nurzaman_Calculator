import { BalancesService } from './balances.service';
import { ChildStatus } from '../children/child.entity';

function mockQueryBuilder(sum: string) {
  const qb = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ sum }),
  };
  return qb;
}

describe('BalancesService', () => {
  describe('getBalance', () => {
    it('computes debt as charged minus paid', async () => {
      const chargesRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder('10000')) };
      const paymentsRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder('6000')) };
      const service = new BalancesService(chargesRepo as any, paymentsRepo as any, {} as any);

      const balance = await service.getBalance('child-1');

      expect(balance).toEqual({ charged: '10000.00', paid: '6000.00', debt: '4000.00' });
    });

    it('produces a negative debt (credit) when overpaid', async () => {
      const chargesRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder('1000')) };
      const paymentsRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder('1500')) };
      const service = new BalancesService(chargesRepo as any, paymentsRepo as any, {} as any);

      const balance = await service.getBalance('child-1');

      expect(balance.debt).toBe('-500.00');
    });

    it('treats no rows (null sum) as zero', async () => {
      const chargesRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder(null as unknown as string)) };
      const paymentsRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder(null as unknown as string)) };
      const service = new BalancesService(chargesRepo as any, paymentsRepo as any, {} as any);

      const balance = await service.getBalance('child-1');

      expect(balance).toEqual({ charged: '0.00', paid: '0.00', debt: '0.00' });
    });
  });

  describe('listDebtors', () => {
    it('only includes active children with a positive debt', async () => {
      const children = [
        { id: 'c1', fullName: 'In Debt' },
        { id: 'c2', fullName: 'Paid Up' },
      ];
      const childrenService = { findAll: jest.fn().mockResolvedValue(children) };

      // c1: charged 5000, paid 0 -> debt 5000. c2: charged 5000, paid 5000 -> debt 0.
      const chargesRepo = { createQueryBuilder: jest.fn(() => mockQueryBuilder('5000')) };
      const paidAmounts = ['0', '5000']; // consumed in the same order children are iterated
      let paidCall = 0;
      const paymentsRepo = {
        createQueryBuilder: jest.fn(() => mockQueryBuilder(paidAmounts[paidCall++])),
      };

      const service = new BalancesService(chargesRepo as any, paymentsRepo as any, childrenService as any);
      const debtors = await service.listDebtors();

      expect(childrenService.findAll).toHaveBeenCalledWith({ status: ChildStatus.ACTIVE });
      expect(debtors).toHaveLength(1);
      expect(debtors[0]).toMatchObject({ childId: 'c1', fullName: 'In Debt', debt: '5000.00' });
    });
  });
});
