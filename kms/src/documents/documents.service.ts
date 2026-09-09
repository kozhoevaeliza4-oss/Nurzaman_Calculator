import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ChildDocument } from './document.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { STORAGE_ADAPTER, StorageAdapter } from './storage/storage.interface';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(ChildDocument) private readonly repo: Repository<ChildDocument>,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  findForChild(childId: string): Promise<ChildDocument[]> {
    return this.repo.find({ where: { childId }, order: { createdAt: 'DESC' } });
  }

  async upload(childId: string, dto: UploadDocumentDto, uploadedBy: string | null): Promise<ChildDocument> {
    const storageKey = `${childId}/${randomUUID()}-${dto.fileName}`;
    const buffer = Buffer.from(dto.content, 'base64');
    await this.storage.save(storageKey, buffer, dto.mimeType);

    return this.repo.save(
      this.repo.create({
        childId,
        type: dto.type,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
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
