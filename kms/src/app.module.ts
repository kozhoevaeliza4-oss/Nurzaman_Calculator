import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { GroupsModule } from './groups/groups.module';
import { ChildrenModule } from './children/children.module';
import { ParentsModule } from './parents/parents.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule {}
