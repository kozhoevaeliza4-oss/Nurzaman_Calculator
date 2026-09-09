import { OneCService } from './onec.service';
import { SyncDirection } from './sync-log.entity';

describe('OneCService', () => {
  function makeService() {
    const syncLogRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    const paymentsService = {
      findUnreconciled: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
      markReconciled: jest.fn((paymentId, oneCDocumentId) =>
        Promise.resolve({ id: paymentId, reconciledAt: new Date(), oneCDocumentId }),
      ),
    };
    const parentsService = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'parent-1', fullName: 'Родитель', phone: '+996700000000', email: 'p@example.com' },
      ]),
    };
    const service = new OneCService(syncLogRepo as any, paymentsService as any, parentsService as any);
    return { service, syncLogRepo, paymentsService, parentsService };
  }

  it('exports only unreconciled payments and logs the export', async () => {
    const { service, syncLogRepo, paymentsService } = makeService();
    const result = await service.exportPayments();

    expect(paymentsService.findUnreconciled).toHaveBeenCalled();
    expect(result).toHaveLength(2);
    expect(syncLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ direction: SyncDirection.EXPORT, entityType: 'payment', recordCount: 2 }),
    );
  });

  it('exports contragents with only the fields 1C needs, not internal ids like userId', async () => {
    const { service } = makeService();
    const result = await service.exportContragents();

    expect(result).toEqual([
      { id: 'parent-1', fullName: 'Родитель', phone: '+996700000000', email: 'p@example.com' },
    ]);
  });

  it('reconciles every item in the batch and logs the import once', async () => {
    const { service, syncLogRepo, paymentsService } = makeService();
    const result = await service.importReconciliation({
      items: [
        { paymentId: 'p1', oneCDocumentId: 'DOC-1' },
        { paymentId: 'p2', oneCDocumentId: 'DOC-2' },
      ],
    });

    expect(paymentsService.markReconciled).toHaveBeenCalledWith('p1', 'DOC-1');
    expect(paymentsService.markReconciled).toHaveBeenCalledWith('p2', 'DOC-2');
    expect(result).toEqual({ reconciled: 2 });
    expect(syncLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ direction: SyncDirection.IMPORT, recordCount: 2 }),
    );
  });
});
