import { join } from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { PaymentsModule } from './payments/payments.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // The MVP's static single-page UI (mvp/frontend) - served straight off
    // this API app, same approach as kms/frontend.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'frontend'),
      exclude: ['/auth*', '/children*', '/payments*', '/expenses*', '/dashboard*', '/exports*'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
      username: process.env.DB_USER || 'mvp',
      password: process.env.DB_PASSWORD || 'change-me',
      database: process.env.DB_NAME || 'asyl_amanat_finance_mvp',
      // Optional: set DB_SCHEMA to isolate the MVP's tables in their own
      // schema when sharing a Postgres instance with another application
      // instead of using a dedicated database - see src/data-source.ts for
      // why both `schema` and the search_path `extra.options` are needed.
      schema: process.env.DB_SCHEMA || undefined,
      extra: process.env.DB_SCHEMA ? { options: `-c search_path=${process.env.DB_SCHEMA},public` } : undefined,
      autoLoadEntities: true,
      // Migrations own schema changes (see src/migrations); never auto-sync.
      synchronize: false,
    }),
    AuthModule,
    ChildrenModule,
    PaymentsModule,
    ExpensesModule,
    DashboardModule,
    ExportsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
