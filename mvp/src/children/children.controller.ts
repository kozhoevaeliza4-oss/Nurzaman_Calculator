import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PaginationQueryDto } from '../common/pagination.dto';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { CommitChildrenImportDto } from './dto/import-children.dto';
import { parseTabularFile } from '../imports/file-parser.util';
import { ChildStatus } from './child.entity';

@UseGuards(JwtAuthGuard)
@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('groupName') groupName?: string,
    @Query('status') status?: ChildStatus,
    @Query('search') search?: string,
  ) {
    return this.childrenService.findAllPaginated(
      { groupName, status, search },
      pagination.page ?? 1,
      pagination.pageSize ?? 50,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.childrenService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateChildDto) {
    return this.childrenService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.childrenService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.childrenService.remove(id);
    return { success: true };
  }

  // ТЗ раздел 4: загрузка файла -> предпросмотр перед сохранением.
  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    const table = await parseTabularFile(file.buffer, file.originalname);
    return this.childrenService.buildPreview(table);
  }

  @Post('import/commit')
  importCommit(@Body() dto: CommitChildrenImportDto, @CurrentUser() user: AuthUser) {
    return this.childrenService.commitImport(dto.fileName, dto.rows, user.fullName);
  }
}
