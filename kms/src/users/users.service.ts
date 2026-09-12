import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FIXED_DIRECTION_ROLES, Role } from '../common/roles.enum';
import { Direction } from '../common/direction.enum';

// A fixed-direction role's `direction` is always derived from the role,
// never from client input - so a request can't sneak a Школа teacher
// into Кидс data by passing a mismatched direction field.
function resolveDirection(role: Role, requested?: Direction | null): Direction | null {
  const fixed = FIXED_DIRECTION_ROLES[role];
  return fixed ? (fixed as Direction) : requested ?? null;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { fullName: 'ASC' } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  create(data: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(data));
  }

  // Module 14 gap fix: without this, only the seed-created director can
  // ever log in — the director/admin needs a way to provision every
  // other staff account (and, via ParentsController, parent logins) from
  // the running app instead of shell access to the database.
  async createStaff(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.repo.save(
      this.repo.create({
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        groupId: dto.groupId ?? null,
        active: dto.active ?? true,
        direction: resolveDirection(dto.role, dto.direction),
      }),
    );
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    user.direction = resolveDirection(user.role, dto.direction ?? user.direction);
    return this.repo.save(user);
  }

  async setPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);
  }

  async changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.save(user);
  }
}
