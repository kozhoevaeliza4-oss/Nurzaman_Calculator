import {
  Body,
  Controller,
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
import { PaymentsService } from './payments.service';
import { CommitTransactionsDto } from './dto/import-transactions.dto';
import { ConfirmMatchDto } from './dto/confirm-match.dto';
import { MatchStatus } from './payment-match.entity';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async importPreview(@UploadedFile() file: Express.Multer.File) {
    return this.paymentsService.previewImport(file.buffer, file.originalname);
  }

  @Post('import/commit')
  importCommit(@Body() dto: CommitTransactionsDto, @CurrentUser() user: AuthUser) {
    return this.paymentsService.commitImport(dto.fileName, dto.rows, user.fullName);
  }

  @Get('matches')
  listMatches(@Query('status') status?: MatchStatus) {
    return this.paymentsService.listMatches(status);
  }

  @Put('matches/:id')
  confirmMatch(@Param('id') id: string, @Body() dto: ConfirmMatchDto, @CurrentUser() user: AuthUser) {
    return this.paymentsService.confirmMatch(id, dto, user.fullName);
  }

  @Get('table')
  table(@Query('period') period: string, @Query('groupName') groupName?: string) {
    return this.paymentsService.paymentsTable(period, groupName);
  }

  @Get('debtors')
  debtors(@Query('period') period: string) {
    return this.paymentsService.debtors(period);
  }

  @Get('bank-operations')
  bankOperations() {
    return this.paymentsService.bankOperations();
  }

  @Get('import-history')
  importHistory() {
    return this.paymentsService.importHistory();
  }
}
