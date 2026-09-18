import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// One row as parsed from the uploaded file, editable by the admin in the
// preview screen before commit (ТЗ раздел 4: "Перед сохранением
// пользователь должен иметь возможность проверить данные").
export class ChildImportRowDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsString()
  monthlyFee?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  parentName?: string;

  @IsOptional()
  @IsString()
  parentPhone?: string;
}

export class CommitChildrenImportDto {
  @IsString()
  fileName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChildImportRowDto)
  rows: ChildImportRowDto[];
}
