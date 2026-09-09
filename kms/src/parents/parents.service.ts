import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from './parent.entity';
import { ChildParent } from './child-parent.entity';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { LinkChildDto } from './dto/link-child.dto';

@Injectable()
export class ParentsService {
  constructor(
    @InjectRepository(Parent) private readonly parentsRepo: Repository<Parent>,
    @InjectRepository(ChildParent) private readonly linksRepo: Repository<ChildParent>,
  ) {}

  findAll(): Promise<Parent[]> {
    return this.parentsRepo.find({ order: { fullName: 'ASC' } });
  }

  async findOne(id: string): Promise<Parent> {
    const parent = await this.parentsRepo.findOne({ where: { id } });
    if (!parent) throw new NotFoundException('Parent not found');
    return parent;
  }

  findByUserId(userId: string): Promise<Parent | null> {
    return this.parentsRepo.findOne({ where: { userId } });
  }

  create(dto: CreateParentDto): Promise<Parent> {
    return this.parentsRepo.save(this.parentsRepo.create(dto));
  }

  async update(id: string, dto: UpdateParentDto): Promise<Parent> {
    const parent = await this.findOne(id);
    Object.assign(parent, dto);
    return this.parentsRepo.save(parent);
  }

  async remove(id: string): Promise<void> {
    const parent = await this.findOne(id);
    await this.parentsRepo.remove(parent);
  }

  async linkChild(parentId: string, dto: LinkChildDto): Promise<ChildParent> {
    await this.findOne(parentId);
    const existing = await this.linksRepo.findOne({
      where: { parentId, childId: dto.childId },
    });
    if (existing) {
      throw new ConflictException('This parent is already linked to this child');
    }
    return this.linksRepo.save(
      this.linksRepo.create({ parentId, childId: dto.childId, relationType: dto.relationType }),
    );
  }

  async unlinkChild(parentId: string, childId: string): Promise<void> {
    const link = await this.linksRepo.findOne({ where: { parentId, childId } });
    if (!link) throw new NotFoundException('Link not found');
    await this.linksRepo.remove(link);
  }

  childrenForParent(parentId: string): Promise<ChildParent[]> {
    return this.linksRepo.find({ where: { parentId }, relations: ['child'] });
  }

  // Shared by every module that scopes a parent's own login to their
  // linked children (finance, attendance, ...).
  async ownsChild(userId: string, childId: string): Promise<boolean> {
    const parent = await this.findByUserId(userId);
    if (!parent) return false;
    const link = await this.linksRepo.findOne({ where: { parentId: parent.id, childId } });
    return !!link;
  }
}
