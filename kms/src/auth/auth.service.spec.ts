import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../common/roles.enum';

describe('AuthService.login', () => {
  function makeService(user: unknown) {
    const usersService = { findByEmail: jest.fn().mockResolvedValue(user) };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    const service = new AuthService(usersService as any, jwtService as any);
    return { service, usersService, jwtService };
  }

  it('rejects an unknown email', async () => {
    const { service } = makeService(null);
    await expect(service.login('nobody@example.com', 'whatever')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a deactivated account even with the right password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const { service } = makeService({ email: 'a@example.com', passwordHash, active: false });
    await expect(service.login('a@example.com', 'correct-password')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const { service } = makeService({ email: 'a@example.com', passwordHash, active: true });
    await expect(service.login('a@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
  });

  it('issues a JWT and never returns the password hash on success', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    const user = {
      id: 'user-1',
      email: 'a@example.com',
      passwordHash,
      active: true,
      fullName: 'A B',
      role: Role.DIRECTOR,
      groupId: null,
    };
    const { service, jwtService } = makeService(user);

    const result = await service.login('a@example.com', 'correct-password');

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual({ id: 'user-1', email: 'a@example.com', fullName: 'A B', role: Role.DIRECTOR });
    expect(JSON.stringify(result)).not.toContain(passwordHash);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', role: Role.DIRECTOR }),
    );
  });
});
