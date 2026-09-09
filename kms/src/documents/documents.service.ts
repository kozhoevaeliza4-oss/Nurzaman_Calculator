import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ChildDocument, DocumentType } from './document.entity';
import { STORAGE_ADAPTER, StorageAdapter } from './storage/storage.interface';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ChildDocument) private readonly repo: Repository<ChildDocument>,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  findForChild(childId: string): Promise<ChildDocument[]> {
    return this.repo.find({ where: { childId }, order: { createdAt: 'DESC' } });
  }

  // Real multipart upload — the file travels as actual bytes (multer),
  // not as base64 text inflating a JSON body by ~33% and forcing the
  // whole file through the JSON parser.
  async upload(
    childId: string,
    type: DocumentType,
    file: UploadedFile,
    uploadedBy: string | null,
  ): Promise<ChildDocument> {
    const storageKey = `${childId}/${randomUUID()}-${file.originalname}`;
    await this.storage.save(storageKey, file.buffer, file.mimetype);

    return this.repo.save(
      this.repo.create({
        childId,
        type,
        fileName: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        uploadedBy,
      }),
    );
  }

  async download(id: string): Promise<{ document: ChildDocument; content: Buffer }> {
    const document = await this.repo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    const content = await this.storage.read(document.storageKey);
    return { document, content };
  }

  async remove(id: string): Promise<void> {
    const document = await this.repo.findOne({ where: { id } });
    if (!document) throw new NotFoundException('Document not found');
    await this.storage.delete(document.storageKey);
    await this.repo.remove(document);
  }
}
