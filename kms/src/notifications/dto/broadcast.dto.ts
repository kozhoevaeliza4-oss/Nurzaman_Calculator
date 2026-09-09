import { IsString, MinLength } from 'class-validator';

export class BroadcastDto {
  @IsString()
  @MinLength(1)
  message: string;
}
