import { ConflictException } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { Role } from '../common/roles.enum';

describe('ParentsService', () => {
  function makeService(overrides: {
    parent?: { id: string; userId: string | null; fullName: string } | null;
    link?: unknown;
  }) {
    const parentsRepo = {
      findOne: jest.fn().mockResolvedValue(overrides.parent ?? null),
      save: jest.fn((data) => Promise.resolve(data)),
      create: jest.fn((data) => data),
    };
    const linksRepo = {
      findOne: jest.fn().mockResolvedValue(overrides.link ?? null),
    };
    const usersService = {
      createStaff: jest.fn().mockResolvedValue({ id: 'user-new' }),
    };
    const service = new ParentsService(parentsRepo as any, linksRepo as any, usersService as any);
    return { service, parentsRepo, linksRepo, usersService };
  }

  describe('ownsChild', () => {
    it('returns false when the user has no parent record', async () => {
      const { service } = makeService({ parent: null });
      expect(await service.ownsChild('user-1', 'child-1')).toBe(false);
    });

    it('returns false when the parent exists but has no link to the child', async () => {
      const { service } = makeService({
        parent: { id: 'parent-1', userId: 'user-1', fullName: 'X' },
        link: null,
      });
      expect(await service.ownsChild('user-1', 'child-1')).toBe(false);
    });

    it('returns true when a link exists', async () => {
      const { service } = makeService({
        parent: { id: 'parent-1', userId: 'user-1', fullName: 'X' },
        link: { childId: 'child-1', parentId: 'parent-1' },
      });
      expect(await service.ownsChild('user-1', 'child-1')).toBe(true);
    });
  });

  describe('createLogin', () => {
    it('refuses to create a second login for the same parent', async () => {
      const { service } = makeService({
        parent: { id: 'parent-1', userId: 'existing-user', fullName: 'X' },
      });
      await expect(service.createLogin('parent-1', 'x@example.com', 'password123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a parent-role user and links it back to the parent record', async () => {
      const { service, usersService, parentsRepo } = makeService({
        parent: { id: 'parent-1', userId: null, fullName: 'Родитель Демо' },
      });
      const result = await service.createLogin('parent-1', 'x@example.com', 'password123');

      expect(usersService.createStaff).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'x@example.com', role: Role.PARENT }),
      );
      expect(result.userId).toBe('user-new');
      expect(parentsRepo.save).toHaveBeenCalled();
    });
  });
});
