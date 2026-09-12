import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubstitutionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsUUID()
  newTeacherId?: string;

  @IsOptional()
  @IsString()
  newRoom?: string;

  @IsOptional()
  @IsBoolean()
  cancelled?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
