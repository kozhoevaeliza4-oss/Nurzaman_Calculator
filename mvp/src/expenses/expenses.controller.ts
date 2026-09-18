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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CommitExpensesImportDto } from './dto/import-expenses.dto';
import { parseTabularFile } from '../imports/file-parser.util';
import { ExpenseCategory } from './expense.entity';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('categories')
  categories() {
    return this.expensesService.listCategories();
  }

  @Get()
  findAll(@Query('category') category?: ExpenseCategory, @Query('from') from?: string, @Query('to') to?: string) {
    return this.expensesService.findAll({ category, from, to });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.expensesService.remove(id);
    return { success: true };
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    const table = await parseTabularFile(file.buffer, file.originalname);
    return this.expensesService.buildPreview(table);
  }

  @Post('import/commit')
  importCommit(@Body() dto: CommitExpensesImportDto, @CurrentUser() user: AuthUser) {
    return this.expensesService.commitImport(dto.fileName, dto.rows, user.fullName);
  }
}
