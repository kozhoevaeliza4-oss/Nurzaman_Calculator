import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dbSchema = process.env.DB_SCHEMA || undefined;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  username: process.env.DB_USER || 'mvp',
  password: process.env.DB_PASSWORD || 'change-me',
  database: process.env.DB_NAME || 'asyl_amanat_finance_mvp',
  // Optional: set DB_SCHEMA to isolate the MVP's tables in their own
  // schema when sharing a Postgres instance with another application
  // (e.g. the full kms system) instead of using a dedicated database.
  // `schema` names the migrations-tracking table's schema; `search_path`
  // makes every unqualified table reference (migrations' CREATE TABLE
  // text, and ordinary entity queries) resolve into it too - both are
  // needed since TypeORM doesn't otherwise apply a connection-level
  // default schema to entities lacking an explicit one.
  schema: dbSchema,
  extra: dbSchema ? { options: `-c search_path=${dbSchema},public` } : undefined,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
