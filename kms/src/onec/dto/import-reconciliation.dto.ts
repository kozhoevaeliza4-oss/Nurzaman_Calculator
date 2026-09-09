import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, IsUUID, ValidateNested } from 'class-validator';

class ReconciliationItemDto {
  @IsUUID()
  paymentId: string;

  @IsString()
  oneCDocumentId: string;
}

export class ImportReconciliationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReconciliationItemDto)
  items: ReconciliationItemDto[];
}
