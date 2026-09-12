import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ChildStatus, ContractStatus } from '../child.entity';
import { Direction } from '../../common/direction.enum';

export class CreateChildDto {
  @IsString()
  fullName: string;

  @IsDateString()
  dateOfBirth: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsDateString()
  enrollmentDate: string;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsEnum(ContractStatus)
  contractStatus?: ContractStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;

  @IsOptional()
  @IsUUID()
  linkedRecordId?: string;
}
