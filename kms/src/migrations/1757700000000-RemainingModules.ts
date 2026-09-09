import { MigrationInterface, QueryRunner } from 'typeorm';

// Covers everything added to finish the backend: Module 1's document
// storage, Module 15 (menu), Module 11 (expenses), Module 9
// (notifications + Parent.telegramChatId), Module 4 (1C reconciliation
// columns on payments + sync log). Modules 6/7/8/10/12 are pure
// aggregation/read endpoints over existing tables and need no schema.
export class RemainingModules1757700000000 implements MigrationInterface {
  name = 'RemainingModules1757700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- Module 1: documents ---------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "document_type_enum" AS ENUM ('birth_certificate', 'medical_clearance', 'contract', 'other')
    `);
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "type" "document_type_enum" NOT NULL,
        "file_name" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "storage_key" varchar NOT NULL,
        "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_documents_child_id" ON "documents" ("child_id")`);

    // --- Module 15: menu ---------------------------------------------------
    await queryRunner.query(`CREATE TYPE "meal_type_enum" AS ENUM ('breakfast', 'lunch', 'snack')`);
    await queryRunner.query(`
      CREATE TABLE "menu_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "date" date NOT NULL,
        "meal_type" "meal_type_enum" NOT NULL,
        "dish_name" varchar NOT NULL,
        "allergens" text[] NOT NULL DEFAULT ARRAY[]::text[]
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_menu_items_date" ON "menu_items" ("date")`);

    // --- Module 11: expenses ------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "expense_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_expense_categories_name" ON "expense_categories" ("name")`);

    await queryRunner.query(`
      CREATE TABLE "expense_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "category_id" uuid NOT NULL REFERENCES "expense_categories"("id") ON DELETE CASCADE,
        "period" varchar NOT NULL,
        "planned_amount" numeric(12,2) NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_expense_plans_category_period" ON "expense_plans" ("category_id", "period")`,
    );

    await queryRunner.query(`
      CREATE TABLE "expense_facts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "category_id" uuid NOT NULL REFERENCES "expense_categories"("id") ON DELETE CASCADE,
        "amount" numeric(12,2) NOT NULL,
        "spent_at" date NOT NULL,
        "description" varchar
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_expense_facts_category_id" ON "expense_facts" ("category_id")`);

    // --- Module 9: notifications --------------------------------------------
    await queryRunner.query(`ALTER TABLE "parents" ADD COLUMN "telegram_chat_id" varchar`);

    await queryRunner.query(`
      CREATE TYPE "notification_channel_enum" AS ENUM ('telegram', 'email', 'push', 'whatsapp')
    `);
    await queryRunner.query(`
      CREATE TYPE "notification_status_enum" AS ENUM ('sent', 'failed', 'not_configured')
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "parent_id" uuid REFERENCES "parents"("id") ON DELETE CASCADE,
        "channel" "notification_channel_enum" NOT NULL,
        "status" "notification_status_enum" NOT NULL,
        "message" varchar NOT NULL,
        "scenario" varchar NOT NULL,
        "error" varchar
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_parent_id" ON "notifications" ("parent_id")`);

    // --- Module 4: 1C reconciliation ----------------------------------------
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "reconciled_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "one_c_document_id" varchar`);

    await queryRunner.query(`CREATE TYPE "sync_direction_enum" AS ENUM ('export', 'import')`);
    await queryRunner.query(`
      CREATE TABLE "one_c_sync_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "direction" "sync_direction_enum" NOT NULL,
        "entity_type" varchar NOT NULL,
        "record_count" integer NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "one_c_sync_logs"`);
    await queryRunner.query(`DROP TYPE "sync_direction_enum"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "one_c_document_id"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "reconciled_at"`);

    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_status_enum"`);
    await queryRunner.query(`DROP TYPE "notification_channel_enum"`);
    await queryRunner.query(`ALTER TABLE "parents" DROP COLUMN "telegram_chat_id"`);

    await queryRunner.query(`DROP TABLE "expense_facts"`);
    await queryRunner.query(`DROP TABLE "expense_plans"`);
    await queryRunner.query(`DROP TABLE "expense_categories"`);

    await queryRunner.query(`DROP TABLE "menu_items"`);
    await queryRunner.query(`DROP TYPE "meal_type_enum"`);

    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP TYPE "document_type_enum"`);
  }
}
