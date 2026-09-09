import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from './tariff.entity';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';

@Injectable()
export class TariffsService {
  constructor(@InjectRepository(Tariff) private readonly repo: Repository<Tariff>) {}

  findAll(): Promise<Tariff[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tariff> {
    const tariff = await this.repo.findOne({ where: { id } });
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  // Most specific wins: a per-child tariff overrides the child's group tariff.
  async resolveForChild(childId: string, groupId: string | null): Promise<Tariff | null> {
    const childTariff = await this.repo.findOne({
      where: { childId },
      order: { createdAt: 'DESC' },
    });
    if (childTariff) return childTariff;

    if (!groupId) return null;
    return this.repo.findOne({ where: { groupId }, order: { createdAt: 'DESC' } });
  }

  create(dto: CreateTariffDto): Promise<Tariff> {
    this.assertExactlyOneTarget(dto);
    return this.repo.save(
      this.repo.create({
        groupId: dto.groupId ?? null,
        childId: dto.childId ?? null,
        amount: dto.amount,
        description: dto.description ?? null,
      }),
    );
  }

  async update(id: string, dto: UpdateTariffDto): Promise<Tariff> {
    const tariff = await this.findOne(id);
    if (dto.groupId !== undefined || dto.childId !== undefined) {
      this.assertExactlyOneTarget({
        groupId: dto.groupId ?? tariff.groupId ?? undefined,
        childId: dto.childId ?? tariff.childId ?? undefined,
      } as CreateTariffDto);
    }
    Object.assign(tariff, dto);
    return this.repo.save(tariff);
  }

  async remove(id: string): Promise<void> {
    const tariff = await this.findOne(id);
    await this.repo.remove(tariff);
  }

  private assertExactlyOneTarget(dto: Pick<CreateTariffDto, 'groupId' | 'childId'>): void {
    const hasGroup = !!dto.groupId;
    const hasChild = !!dto.childId;
    if (hasGroup === hasChild) {
      throw new BadRequestException('Exactly one of groupId or childId must be set');
    }
  }
}
