import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from '../parents/parents.service';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

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
  async upload(
    @Param('childId') childId: string,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    const document = await this.documentsService.upload(childId, dto, user.userId);
    await this.auditService.record(user, 'upload', 'document', document.id, {
      childId,
      type: dto.type,
      fileName: dto.fileName,
    });
    return document;
  }

  @Roles(Role.DIRECTOR, Role.ADMIN, Role.TEACHER, Role.MEDIC)
  @Get(':id/download')
  async download(@Param('id') id: string) {
    const { document, content } = await this.documentsService.download(id);
    return { ...document, content: content.toString('base64') };
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
