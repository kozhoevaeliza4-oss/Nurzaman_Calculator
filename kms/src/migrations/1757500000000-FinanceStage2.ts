import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 2: Module 3 (finance) — tariffs, charges (accruals), payments,
// and receipts. See kms/README.md for the fixed-tariff scope decision.
export class FinanceStage21757500000000 implements MigrationInterface {
  name = 'FinanceStage21757500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tariffs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "group_id" uuid REFERENCES "groups"("id") ON DELETE CASCADE,
        "child_id" uuid REFERENCES "children"("id") ON DELETE CASCADE,
        "amount" numeric(12,2) NOT NULL,
        "description" varchar,
        CONSTRAINT "chk_tariffs_exactly_one_target" CHECK (
          (("group_id" IS NOT NULL)::int + ("child_id" IS NOT NULL)::int) = 1
        )
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_tariffs_group_id" ON "tariffs" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tariffs_child_id" ON "tariffs" ("child_id")`);

    await queryRunner.query(`
      CREATE TYPE "charge_type_enum" AS ENUM ('monthly_tariff', 'one_time', 'discount')
    `);
    await queryRunner.query(`
      CREATE TABLE "charges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "amount" numeric(12,2) NOT NULL,
        "type" "charge_type_enum" NOT NULL,
        "description" varchar,
        "due_date" date NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_charges_child_id" ON "charges" ("child_id")`);
    await queryRunner.query(`CREATE INDEX "idx_charges_due_date" ON "charges" ("due_date")`);

    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM ('bank_qr', 'cash', 'bank_transfer')
    `);
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "amount" numeric(12,2) NOT NULL,
        "method" "payment_method_enum" NOT NULL,
        "paid_at" date NOT NULL,
        "note" varchar,
        "recorded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_payments_child_id" ON "payments" ("child_id")`);

    await queryRunner.query(`CREATE SEQUENCE "receipt_number_seq" START 1000`);
    await queryRunner.query(`
      CREATE TABLE "receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "receipt_number" bigint NOT NULL,
        "payment_id" uuid NOT NULL UNIQUE REFERENCES "payments"("id") ON DELETE CASCADE,
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "amount" numeric(12,2) NOT NULL,
        "issued_at" TIMESTAMPTZ NOT NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_receipts_receipt_number" ON "receipts" ("receipt_number")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_receipts_child_id" ON "receipts" ("child_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "receipts"`);
    await queryRunner.query(`DROP SEQUENCE "receipt_number_seq"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TABLE "charges"`);
    await queryRunner.query(`DROP TYPE "charge_type_enum"`);
    await queryRunner.query(`DROP TABLE "tariffs"`);
  }
}
