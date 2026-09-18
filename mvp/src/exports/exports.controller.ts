import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExportsService } from './exports.service';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('excel/children')
  async childrenExcel(@Res() res: Response) {
    const buffer = await this.exportsService.childrenExcel();
    sendXlsx(res, buffer, 'children.xlsx');
  }

  @Get('excel/payments')
  async paymentsExcel(@Query('period') period: string, @Res() res: Response) {
    const buffer = await this.exportsService.paymentsExcel(period);
    sendXlsx(res, buffer, `payments-${period}.xlsx`);
  }

  @Get('excel/debtors')
  async debtorsExcel(@Query('period') period: string, @Res() res: Response) {
    const buffer = await this.exportsService.debtorsExcel(period);
    sendXlsx(res, buffer, `debtors-${period}.xlsx`);
  }

  @Get('excel/expenses')
  async expensesExcel(@Query('from') from: string | undefined, @Query('to') to: string | undefined, @Res() res: Response) {
    const buffer = await this.exportsService.expensesExcel(from, to);
    sendXlsx(res, buffer, 'expenses.xlsx');
  }

  @Get('excel/bank-operations')
  async bankOperationsExcel(@Res() res: Response) {
    const buffer = await this.exportsService.bankOperationsExcel();
    sendXlsx(res, buffer, 'bank-operations.xlsx');
  }

  @Get('pdf/summary')
  async summaryPdf(@Query('period') period: string, @Res() res: Response) {
    const buffer = await this.exportsService.summaryPdf(period);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="summary-${period}.pdf"`);
    res.send(buffer);
  }
}

function sendXlsx(res: Response, buffer: Buffer, filename: string) {
  res.setHeader('Content-Type', XLSX_TYPE);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}
