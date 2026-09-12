import { MigrationInterface, QueryRunner } from 'typeorm';

// ТЗ v3.0: направления (Кидс/Школа) + школьный блок (модули 16-20).
// Existing rows (groups/children/users/expense_categories) all predate
// this - direction defaults to 'kids' so nothing already in the database
// silently vanishes from a Кидс-scoped view.
export class SchoolDirectionV31760000000000 implements MigrationInterface {
  name = 'SchoolDirectionV31760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "direction_enum" AS ENUM ('kids', 'school')`);

    // --- Direction on existing tables --------------------------------------
    await queryRunner.query(`
      ALTER TABLE "groups"
        ADD COLUMN "direction" "direction_enum" NOT NULL DEFAULT 'kids',
        ADD COLUMN "parallel" int,
        ADD COLUMN "letter" varchar
    `);
    await queryRunner.query(`
      ALTER TABLE "children"
        ADD COLUMN "direction" "direction_enum" NOT NULL DEFAULT 'kids',
        ADD COLUMN "linked_record_id" uuid
    `);
    await queryRunner.query(`CREATE INDEX "idx_children_direction" ON "children" ("direction")`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "direction" "direction_enum"`);
    await queryRunner.query(`ALTER TABLE "expense_categories" ADD COLUMN "direction" "direction_enum"`);

    // New roles (section 2 of ТЗ v3.0).
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE 'deputy_head'`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE 'homeroom_teacher'`);
    await queryRunner.query(`ALTER TYPE "user_role_enum" ADD VALUE 'subject_teacher'`);

    // --- Module 16: subjects -------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar NOT NULL
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_subjects_name" ON "subjects" ("name")`);

    await queryRunner.query(`
      CREATE TABLE "class_subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_class_subjects_group_subject" ON "class_subjects" ("group_id", "subject_id")`);

    await queryRunner.query(`
      CREATE TABLE "teacher_subject_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_tsa_teacher_subject_group" ON "teacher_subject_assignments" ("teacher_id", "group_id", "subject_id")
    `);

    // --- Module 17: grades ----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "grades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "student_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "date" date NOT NULL,
        "value" int NOT NULL,
        "comment" text
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_grades_student" ON "grades" ("student_id")`);
    await queryRunner.query(`CREATE INDEX "idx_grades_subject" ON "grades" ("subject_id")`);
    await queryRunner.query(`CREATE INDEX "idx_grades_group" ON "grades" ("group_id")`);

    // --- Module 18: schedule + per-lesson attendance --------------------------
    await queryRunner.query(`
      CREATE TABLE "lesson_slots" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "day_of_week" int NOT NULL,
        "lesson_number" int NOT NULL,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "room" varchar
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_lesson_slots_group_day_number" ON "lesson_slots" ("group_id", "day_of_week", "lesson_number")
    `);

    await queryRunner.query(`
      CREATE TABLE "schedule_changes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lesson_slot_id" uuid NOT NULL REFERENCES "lesson_slots"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "new_teacher_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "new_room" varchar,
        "cancelled" boolean NOT NULL DEFAULT false,
        "reason" text
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_schedule_changes_slot" ON "schedule_changes" ("lesson_slot_id")`);

    await queryRunner.query(`CREATE TYPE "lesson_attendance_status_enum" AS ENUM ('present', 'absent', 'late')`);
    await queryRunner.query(`
      CREATE TABLE "lesson_attendance" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lesson_slot_id" uuid NOT NULL REFERENCES "lesson_slots"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "status" "lesson_attendance_status_enum" NOT NULL,
        "marked_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_lesson_attendance_student" ON "lesson_attendance" ("student_id")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_lesson_attendance_slot_student_date" ON "lesson_attendance" ("lesson_slot_id", "student_id", "date")
    `);

    // --- Module 19: homework ---------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "homework" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "teacher_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
        "due_date" date NOT NULL,
        "description" text NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_homework_group" ON "homework" ("group_id")`);

    await queryRunner.query(`
      CREATE TABLE "homework_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "homework_id" uuid NOT NULL REFERENCES "homework"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "done" boolean NOT NULL DEFAULT false,
        "note" text
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_homework_submissions_hw_student" ON "homework_submissions" ("homework_id", "student_id")
    `);

    // --- Module 20: periods, exams -------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "academic_periods" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "name" varchar NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "academic_year" varchar NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "period_grades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "period_id" uuid NOT NULL REFERENCES "academic_periods"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "auto_average" numeric(4,2),
        "manual_override" int,
        "final_value" int NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_period_grades_student" ON "period_grades" ("student_id")`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_period_grades_period_student_subject" ON "period_grades" ("period_id", "student_id", "subject_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "exams" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "period_id" uuid NOT NULL REFERENCES "academic_periods"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
        "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
        "date" date NOT NULL,
        "max_score" int NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "exam_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "children"("id") ON DELETE CASCADE,
        "score" int NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_exam_results_student" ON "exam_results" ("student_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_exam_results_exam_student" ON "exam_results" ("exam_id", "student_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "exam_results"`);
    await queryRunner.query(`DROP TABLE "exams"`);
    await queryRunner.query(`DROP TABLE "period_grades"`);
    await queryRunner.query(`DROP TABLE "academic_periods"`);
    await queryRunner.query(`DROP TABLE "homework_submissions"`);
    await queryRunner.query(`DROP TABLE "homework"`);
    await queryRunner.query(`DROP TABLE "lesson_attendance"`);
    await queryRunner.query(`DROP TYPE "lesson_attendance_status_enum"`);
    await queryRunner.query(`DROP TABLE "schedule_changes"`);
    await queryRunner.query(`DROP TABLE "lesson_slots"`);
    await queryRunner.query(`DROP TABLE "grades"`);
    await queryRunner.query(`DROP TABLE "teacher_subject_assignments"`);
    await queryRunner.query(`DROP TABLE "class_subjects"`);
    await queryRunner.query(`DROP TABLE "subjects"`);
    await queryRunner.query(`ALTER TABLE "expense_categories" DROP COLUMN "direction"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "direction"`);
    await queryRunner.query(`ALTER TABLE "children" DROP COLUMN "linked_record_id", DROP COLUMN "direction"`);
    await queryRunner.query(`ALTER TABLE "groups" DROP COLUMN "letter", DROP COLUMN "parallel", DROP COLUMN "direction"`);
    await queryRunner.query(`DROP TYPE "direction_enum"`);
    // Postgres has no DROP VALUE for enums - reverting the new roles would
    // require recreating "user_role_enum" from scratch; not done here since
    // this migration is not expected to be rolled back in production.
  }
}
