import { join } from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { SubjectsModule } from './subjects/subjects.module';
import { GradesModule } from './grades/grades.module';
import { ScheduleModule } from './schedule/schedule.module';
import { HomeworkModule } from './homework/homework.module';
import { PeriodsModule } from './periods/periods.module';
import { RequestLoggingMiddleware } from './common/request-logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // The minimal staff/parent web UI (kms/frontend) — a starting point for
    // Module 6's web personal cabinet and a staff panel, not a build step,
    // so it ships as plain static files served straight off the API app.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'frontend'),
      exclude: [
        '/auth*',
        '/users*',
        '/audit*',
        '/groups*',
        '/children*',
        '/parents*',
        '/finance*',
        '/attendance*',
        '/documents*',
        '/menu*',
        '/expenses*',
        '/dashboard*',
        '/reports*',
        '/notifications*',
        '/me*',
        '/onec*',
        '/assistant*',
        '/analytics*',
        '/health*',
        '/docs*',
        '/subjects*',
        '/grades*',
        '/schedule*',
        '/homework*',
        '/periods*',
      ],
    }),
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
    SubjectsModule,
    GradesModule,
    ScheduleModule,
    HomeworkModule,
    PeriodsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
