import { IsEnum, IsString, MinLength } from 'class-validator';
import { DocumentType } from '../document.entity';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  // Base64-encoded file content.
  @IsString()
  @MinLength(1)
  content: string;
}
