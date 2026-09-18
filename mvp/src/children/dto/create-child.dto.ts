import { IsDateString, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ChildStatus } from '../child.entity';

export class CreateChildDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsNumberString()
  monthlyFee: string;

  @IsOptional()
  @IsEnum(ChildStatus)
  status?: ChildStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
