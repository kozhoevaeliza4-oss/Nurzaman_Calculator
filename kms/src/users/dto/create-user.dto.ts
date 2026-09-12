import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '../../common/roles.enum';
import { Direction } from '../../common/direction.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(Role)
  role: Role;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  // Only meaningful for ADMIN (pin to one direction) - fixed-direction
  // roles (teacher/deputy_head/homeroom_teacher/subject_teacher) get
  // their direction from the role itself and this is ignored for them.
  @IsOptional()
  @IsEnum(Direction)
  direction?: Direction;
}
