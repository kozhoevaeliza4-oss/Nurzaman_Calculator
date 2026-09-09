import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsUUID()
  teacherId?: string;
}
