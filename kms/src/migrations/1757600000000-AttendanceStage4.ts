import { MigrationInterface, QueryRunner } from 'typeorm';

// Stage 4: Module 5 (QR attendance). Adds the child QR code and the
// attendance_records table. Face recognition is deferred (see README —
// it needs a legal sign-off first), so this is QR-only.
export class AttendanceStage41757600000000 implements MigrationInterface {
  name = 'AttendanceStage41757600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "children" ADD COLUMN "qr_code" varchar`);
    await queryRunner.query(`
      UPDATE "children" SET "qr_code" = encode(gen_random_bytes(24), 'base64') WHERE "qr_code" IS NULL
    `);
    await queryRunner.query(`ALTER TABLE "children" ALTER COLUMN "qr_code" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_children_qr_code" ON "children" ("qr_code")`);

    await queryRunner.query(`
      CREATE TYPE "attendance_event_type_enum" AS ENUM ('check_in', 'check_out')
    `);
    await queryRunner.query(`
      CREATE TABLE "attendance_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "child_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "event_type" "attendance_event_type_enum" NOT NULL,
        "occurred_at" TIMESTAMPTZ NOT NULL,
        "recorded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "recorded_by_role" varchar
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_attendance_records_child_id" ON "attendance_records" ("child_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_attendance_records_occurred_at" ON "attendance_records" ("occurred_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "attendance_records"`);
    await queryRunner.query(`DROP TYPE "attendance_event_type_enum"`);
    await queryRunner.query(`DROP INDEX "idx_children_qr_code"`);
    await queryRunner.query(`ALTER TABLE "children" DROP COLUMN "qr_code"`);
  }
}
