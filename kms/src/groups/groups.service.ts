import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Group } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Direction } from '../common/direction.enum';

@Injectable()
export class GroupsService {
  constructor(@InjectRepository(Group) private readonly repo: Repository<Group>) {}

  // `allowed` is the caller's effective directions (null = both, from
  // common/direction-scope.ts); `requested` narrows further within that
  // when the caller asked for one direction via a query param.
  findAll(allowed: Direction[] | null, requested?: Direction): Promise<Group[]> {
    const dirs = requested ? [requested] : allowed;
    return this.repo.find({
      where: dirs ? { direction: In(dirs) } : {},
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, allowed?: Direction[] | null): Promise<Group> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group || (allowed && !allowed.includes(group.direction))) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  create(dto: CreateGroupDto): Promise<Group> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);
    Object.assign(group, dto);
    return this.repo.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    await this.repo.remove(group);
  }
}
