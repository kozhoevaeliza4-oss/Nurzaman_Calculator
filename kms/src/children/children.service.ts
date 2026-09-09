import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Child } from './child.entity';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { QueryChildrenDto } from './dto/query-children.dto';

@Injectable()
export class ChildrenService {
  constructor(@InjectRepository(Child) private readonly repo: Repository<Child>) {}

  // scopedGroupId is set for the "teacher" role: they only ever see their own group.
  async findAll(query: QueryChildrenDto, scopedGroupId?: string | null): Promise<Child[]> {
    const qb = this.repo.createQueryBuilder('child');

    const groupId = scopedGroupId ?? query.groupId;
    if (groupId) {
      qb.andWhere('child.groupId = :groupId', { groupId });
    }
    if (query.status) {
      qb.andWhere('child.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('child.fullName ILIKE :search', { search: `%${query.search}%` });
    }

    return qb.orderBy('child.fullName', 'ASC').getMany();
  }

  async findOne(id: string): Promise<Child> {
    const child = await this.repo.findOne({ where: { id } });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async findByQrCode(qrCode: string): Promise<Child> {
    const child = await this.repo.findOne({ where: { qrCode } });
    if (!child) throw new NotFoundException('Unknown QR code');
    return child;
  }

  create(dto: CreateChildDto): Promise<Child> {
    return this.repo.save(this.repo.create({ ...dto, qrCode: this.generateQrCode() }));
  }

  async regenerateQrCode(id: string): Promise<Child> {
    const child = await this.findOne(id);
    child.qrCode = this.generateQrCode();
    return this.repo.save(child);
  }

  private generateQrCode(): string {
    // base64url, ~32 chars — opaque and URL/QR-safe.
    return randomBytes(24).toString('base64url');
  }

  async update(id: string, dto: UpdateChildDto): Promise<Child> {
    const child = await this.findOne(id);
    Object.assign(child, dto);
    return this.repo.save(child);
  }

  async remove(id: string): Promise<void> {
    const child = await this.findOne(id);
    await this.repo.remove(child);
  }
}
