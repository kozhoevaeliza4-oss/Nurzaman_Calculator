import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OpenAiClient } from '../ai/openai.client';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  providers: [AnalyticsService, OpenAiClient],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
