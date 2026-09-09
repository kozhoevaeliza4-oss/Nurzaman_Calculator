import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { Role } from '../common/roles.enum';

describe('UsersService', () => {
  function makeService(existing: unknown) {
    const repo = {
      findOne: jest.fn().mockResolvedValue(existing),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    const service = new UsersService(repo as any);
    return { service, repo };
  }

  describe('createStaff', () => {
    it('refuses a duplicate email', async () => {
      const { service } = makeService({ id: 'existing', email: 'a@example.com' });
      await expect(
        service.createStaff({ email: 'a@example.com', password: 'password123', fullName: 'X', role: Role.TEACHER }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashes the password rather than storing it in plaintext', async () => {
      const { service, repo } = makeService(null);
      await service.createStaff({
        email: 'new@example.com',
        password: 'password123',
        fullName: 'X',
        role: Role.TEACHER,
      });
      const saved = repo.save.mock.calls[0][0];
      expect(saved.passwordHash).toBeDefined();
      expect(saved.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', saved.passwordHash)).toBe(true);
    });
  });

  describe('changeOwnPassword', () => {
    it('throws if the user does not exist', async () => {
      const { service } = makeService(null);
      await expect(service.changeOwnPassword('missing', 'old', 'newpassword1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects when the current password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correct', 4);
      const { service } = makeService({ id: 'u1', passwordHash });
      await expect(service.changeOwnPassword('u1', 'wrong', 'newpassword1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('updates the hash when the current password is right', async () => {
      const passwordHash = await bcrypt.hash('correct', 4);
      const { service, repo } = makeService({ id: 'u1', passwordHash });
      await service.changeOwnPassword('u1', 'correct', 'newpassword1');
      const saved = repo.save.mock.calls[0][0];
      expect(await bcrypt.compare('newpassword1', saved.passwordHash)).toBe(true);
    });
  });
});
