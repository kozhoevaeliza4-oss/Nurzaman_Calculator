import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 1 (see kms/README.md): roles/users, audit log, groups, children,
// parents and the child<->parent link table (Modules 1, 2, 14 of the TZ).
export class InitStage11757400000000 implements MigrationInterface {
  name = 'InitStage11757400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('director', 'admin', 'accountant', 'teacher', 'medic', 'parent')
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "email" varchar NOT NULL,
        "password_hash" varchar NOT NULL,
        "full_name" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "group_id" uuid
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email")`);

    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid,
        "user_email" varchar,
        "action" varchar NOT NULL,
        "entity_type" varchar NOT NULL,
        "entity_id" varchar,
        "details" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_user_id" ON "audit_log" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_entity_type" ON "audit_log" ("entity_type")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_entity_id" ON "audit_log" ("entity_id")`);

    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar NOT NULL,
        "capacity" integer NOT NULL,
        "teacher_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "fk_users_group"
        FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "child_status_enum" AS ENUM ('active', 'left', 'academic_leave')
    `);
    await queryRunner.query(`
      CREATE TYPE "contract_status_enum" AS ENUM ('active', 'completed')
    `);
    await queryRunner.query(`
      CREATE TABLE "children" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "full_name" varchar NOT NULL,
        "date_of_birth" date NOT NULL,
        "group_id" uuid REFERENCES "groups"("id") ON DELETE SET NULL,
        "photo_url" varchar,
        "enrollment_date" date NOT NULL,
        "status" "child_status_enum" NOT NULL DEFAULT 'active',
        "contract_status" "contract_status_enum",
        "allergies" text[] NOT NULL DEFAULT ARRAY[]::text[]
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_children_group_id" ON "children" ("group_id")`);
    await queryRunner.query(`CREATE INDEX "idx_children_status" ON "children" ("status")`);

    await queryRunner.query(`
      CREATE TABLE "parents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "full_name" varchar NOT NULL,
        "phone" varchar,
        "email" varchar,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_parents_phone" ON "parents" ("phone")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_parents_user_id" ON "parents" ("user_id") WHERE "user_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TYPE "relation_type_enum" AS ENUM ('mother', 'father', 'guardian', 'other')
    `);
    await queryRunner.query(`
      CREATE TABLE "child_parents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "parent_id" uuid NOT NULL REFERENCES "parents"("id") ON DELETE CASCADE,
        "relation_type" "relation_type_enum" NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_child_parents_child_id" ON "child_parents" ("child_id")`);
    await queryRunner.query(`CREATE INDEX "idx_child_parents_parent_id" ON "child_parents" ("parent_id")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_child_parents_unique" ON "child_parents" ("child_id", "parent_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "child_parents"`);
    await queryRunner.query(`DROP TYPE "relation_type_enum"`);
    await queryRunner.query(`DROP TABLE "parents"`);
    await queryRunner.query(`DROP TABLE "children"`);
    await queryRunner.query(`DROP TYPE "contract_status_enum"`);
    await queryRunner.query(`DROP TYPE "child_status_enum"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "fk_users_group"`);
    await queryRunner.query(`DROP TABLE "groups"`);
    await queryRunner.query(`DROP TABLE "audit_log"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
