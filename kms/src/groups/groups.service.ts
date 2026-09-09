import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(@InjectRepository(Group) private readonly repo: Repository<Group>) {}

  findAll(): Promise<Group[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Group> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
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
