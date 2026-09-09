import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { GroupsModule } from './groups/groups.module';
import { ChildrenModule } from './children/children.module';
import { ParentsModule } from './parents/parents.module';
import { FinanceModule } from './finance/finance.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DocumentsModule } from './documents/documents.module';
import { MenuModule } from './menu/menu.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MeModule } from './me/me.module';
import { OneCModule } from './onec/onec.module';
import { AssistantModule } from './assistant/assistant.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Default rate limit for every endpoint; auth applies a stricter
    // per-route limit on top of this (see AuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER || 'kms',
      password: process.env.DB_PASSWORD || 'change-me',
      database: process.env.DB_NAME || 'asyl_amanat_kms',
      autoLoadEntities: true,
      // Migrations own schema changes (see src/migrations); never auto-sync.
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    GroupsModule,
    ChildrenModule,
    ParentsModule,
    FinanceModule,
    AttendanceModule,
    DocumentsModule,
    MenuModule,
    ExpensesModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    MeModule,
    OneCModule,
    AssistantModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
