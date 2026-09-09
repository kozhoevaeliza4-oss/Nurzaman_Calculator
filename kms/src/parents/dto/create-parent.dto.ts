import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateParentDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
