import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/roles.enum';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';

@Roles(Role.PARENT)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto, @CurrentUser() user: AuthUser) {
    return this.assistantService.chat(user.userId, dto.message);
  }
}
