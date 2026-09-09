import { IsEnum } from 'class-validator';
import { DocumentType } from '../document.entity';

// The file itself arrives as multipart, not in this DTO — see
// DocumentsController.upload (FileInterceptor). This only validates the
// one text field multer passes through alongside it.
export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;
}
