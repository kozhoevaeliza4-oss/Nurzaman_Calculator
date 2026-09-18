import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMvp1789726542121 implements MigrationInterface {
    name = 'InitMvp1789726542121'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "bank_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "amount" numeric(12,2) NOT NULL, "payer_name" character varying NOT NULL, "purpose" text, "transaction_ref" character varying, "fingerprint" character varying NOT NULL, "import_batch_id" uuid NOT NULL, CONSTRAINT "PK_123cc87304eefb2c497b4acdd10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bdf11602032d1c0cad7507628c" ON "bank_transactions" ("fingerprint") `);
        await queryRunner.query(`CREATE TYPE "public"."payment_matches_period_source_enum" AS ENUM('purpose_text', 'transaction_date', 'manual', 'unknown')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_matches_confidence_tier_enum" AS ENUM('green', 'yellow', 'red')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_matches_status_enum" AS ENUM('auto_confirmed', 'needs_review', 'confirmed', 'rejected', 'not_a_payment')`);
        await queryRunner.query(`CREATE TABLE "payment_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "transaction_id" uuid NOT NULL, "child_id" uuid, "period_year_month" character varying, "period_source" "public"."payment_matches_period_source_enum" NOT NULL DEFAULT 'unknown', "confidence_score" integer NOT NULL DEFAULT '0', "confidence_tier" "public"."payment_matches_confidence_tier_enum" NOT NULL DEFAULT 'red', "confidence_reasons" jsonb NOT NULL DEFAULT '[]', "status" "public"."payment_matches_status_enum" NOT NULL DEFAULT 'needs_review', "confirmed_by" character varying, "confirmed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_02961763af1d8094d9780b2a875" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ac4eddf5a18524b08ecb34f49d" ON "payment_matches" ("transaction_id") `);
        await queryRunner.query(`CREATE TYPE "public"."import_batches_type_enum" AS ENUM('children', 'bank_statement', 'expenses')`);
        await queryRunner.query(`CREATE TABLE "import_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "type" "public"."import_batches_type_enum" NOT NULL, "file_name" character varying NOT NULL, "total_rows" integer NOT NULL, "matched_rows" integer NOT NULL DEFAULT '0', "needs_review_rows" integer NOT NULL DEFAULT '0', "skipped_duplicate_rows" integer NOT NULL DEFAULT '0', "uploaded_by" character varying, CONSTRAINT "PK_6162597a2576c03e04bb2c1a2dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."expenses_category_enum" AS ENUM('зарплата', 'продукты', 'аренда', 'коммунальные услуги', 'хозяйственные расходы', 'канцтовары', 'ремонт', 'обучение', 'налоги', 'прочее')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "category" "public"."expenses_category_enum" NOT NULL, "amount" numeric(12,2) NOT NULL, "description" text, "payment_method" character varying, "comment" text, CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."children_status_enum" AS ENUM('active', 'inactive')`);
        await queryRunner.query(`CREATE TABLE "children" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "full_name" character varying NOT NULL, "group_name" character varying, "monthly_fee" numeric(12,2) NOT NULL, "status" "public"."children_status_enum" NOT NULL DEFAULT 'active', "start_date" date, "end_date" date, "parent_name" character varying, "parent_phone" character varying, "notes" text, CONSTRAINT "PK_8c5a7cbebf2c702830ef38d22b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0a1c9f5da658702c0cb055e92d" ON "children" ("full_name") `);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "full_name" character varying NOT NULL, CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dcd0c8a4b10af9c986e510b9ec" ON "admin_users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_dcd0c8a4b10af9c986e510b9ec"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a1c9f5da658702c0cb055e92d"`);
        await queryRunner.query(`DROP TABLE "children"`);
        await queryRunner.query(`DROP TYPE "public"."children_status_enum"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_category_enum"`);
        await queryRunner.query(`DROP TABLE "import_batches"`);
        await queryRunner.query(`DROP TYPE "public"."import_batches_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac4eddf5a18524b08ecb34f49d"`);
        await queryRunner.query(`DROP TABLE "payment_matches"`);
        await queryRunner.query(`DROP TYPE "public"."payment_matches_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_matches_confidence_tier_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_matches_period_source_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bdf11602032d1c0cad7507628c"`);
        await queryRunner.query(`DROP TABLE "bank_transactions"`);
    }

}
