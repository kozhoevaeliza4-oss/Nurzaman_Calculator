import { Module } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { OpenAiClient } from '../ai/openai.client';
import { ParentsModule } from '../parents/parents.module';
import { FinanceModule } from '../finance/finance.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [ParentsModule, FinanceModule, AttendanceModule, MenuModule],
  providers: [AssistantService, OpenAiClient],
  controllers: [AssistantController],
})
export class AssistantModule {}
