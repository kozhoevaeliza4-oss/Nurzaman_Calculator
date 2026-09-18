import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';

// Runs before migrations when DB_SCHEMA is set (sharing a Postgres
// instance with another app). TypeORM's own migrations-tracking table is
// created using the connection's configured schema, so that schema has to
// exist *before* AppDataSource (which sets `schema`) ever connects - this
// script connects without a schema (default search_path) purely to run
// CREATE SCHEMA IF NOT EXISTS, then disconnects. No-op if DB_SCHEMA unset.
async function ensureSchema() {
  const schema = process.env.DB_SCHEMA;
  if (!schema) {
    console.log('DB_SCHEMA not set - skipping (using default schema).');
    return;
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER || 'mvp',
    password: process.env.DB_PASSWORD || 'change-me',
    database: process.env.DB_NAME || 'asyl_amanat_finance_mvp',
  });

  await dataSource.initialize();
  await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  console.log(`Schema "${schema}" ensured.`);
  await dataSource.destroy();
}

ensureSchema().catch((err) => {
  console.error(err);
  process.exit(1);
});
