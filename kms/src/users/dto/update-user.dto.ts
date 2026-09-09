import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Role } from '../../common/roles.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
