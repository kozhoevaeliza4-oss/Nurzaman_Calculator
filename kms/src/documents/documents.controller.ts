import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB — a scanned document/photo, not a video.

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly parentsService: ParentsService,
    private readonly auditService: AuditService,
  ) {}

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.MEDIC)
  @Get('children/:childId')
  listForChild(@Param('childId') childId: string) {
    return this.documentsService.findForChild(childId);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Post('children/:childId')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: ['birth_certificate', 'medical_clearance', 'contract', 'other'] },
      },
    },
  })
  async upload(
    @Param('childId') childId: string,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('No file was uploaded (expected multipart field "file")');

    const document = await this.documentsService.upload(childId, dto.type, file, user.userId);
    await this.auditService.record(user, 'upload', 'document', document.id, {
      childId,
      type: dto.type,
      fileName: file.originalname,
    });
    return document;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.MEDIC)
  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { document, content } = await this.documentsService.download(id);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`);
    res.send(content);
  }

  @Roles(Role.DIRECTOR, Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.documentsService.remove(id);
    await this.auditService.record(user, 'delete', 'document', id);
    return { success: true };
  }

  @Roles(Role.PARENT)
  @Get('me/children/:childId')
  async listForMyChild(@Param('childId') childId: string, @CurrentUser() user: AuthUser) {
    const owns = await this.parentsService.ownsChild(user.userId, childId);
    if (!owns) throw new ForbiddenException('You do not have access to this child');
    return this.documentsService.findForChild(childId);
  }
}
