import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { Child } from './child.entity';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { QueryChildrenDto } from './dto/query-children.dto';
import { Paginated, paginate } from '../common/pagination.dto';
import { Direction } from '../common/direction.enum';

@Injectable()
export class ChildrenService {
  constructor(@InjectRepository(Child) private readonly repo: Repository<Child>) {}

  // scopedGroupId is set for the "teacher"/"homeroom_teacher" role: they
  // only ever see their own group/class. `allowedDirections` (null = both)
  // comes from common/direction-scope.ts and keeps Кидс/Школа data apart.
  // Used internally by other modules (dashboard, menu warnings, charges,
  // attendance, ...) that need every matching row, not a page of them.
  async findAll(
    query: QueryChildrenDto,
    scopedGroupId?: string | null,
    allowedDirections?: Direction[] | null,
  ): Promise<Child[]> {
    return this.buildQuery(query, scopedGroupId, allowedDirections)
      .orderBy('child.fullName', 'ASC')
      .getMany();
  }

  // The list endpoint's version: same filters, but paged — a kindergarten
  // stays small, but the list only grows over the years the system runs.
  async findAllPaginated(
    query: QueryChildrenDto,
    page: number,
    pageSize: number,
    scopedGroupId?: string | null,
    allowedDirections?: Direction[] | null,
  ): Promise<Paginated<Child>> {
    const qb = this.buildQuery(query, scopedGroupId, allowedDirections).orderBy('child.fullName', 'ASC');
    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return paginate(items, total, page, pageSize);
  }

  private buildQuery(
    query: QueryChildrenDto,
    scopedGroupId?: string | null,
    allowedDirections?: Direction[] | null,
  ) {
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
    const dirs = query.direction ? [query.direction] : allowedDirections;
    if (dirs) {
      qb.andWhere('child.direction IN (:...dirs)', { dirs });
    }

    return qb;
  }

  async findOne(id: string, allowedDirections?: Direction[] | null): Promise<Child> {
    const child = await this.repo.findOne({ where: { id } });
    if (!child || (allowedDirections && !allowedDirections.includes(child.direction))) {
      throw new NotFoundException('Child not found');
    }
    return child;
  }

  async findByQrCode(qrCode: string): Promise<Child> {
    const child = await this.repo.findOne({ where: { qrCode } });
    if (!child) throw new NotFoundException('Unknown QR code');
    return child;
  }

  async create(dto: CreateChildDto): Promise<Child> {
    const duplicate = await this.repo.findOne({
      where: {
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth,
        direction: dto.direction ?? Direction.KIDS,
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'A child with this full name and date of birth already exists',
      );
    }
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
