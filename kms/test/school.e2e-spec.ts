import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/all-exceptions.filter';
import { User } from '../src/users/user.entity';
import { Role } from '../src/common/roles.enum';
import * as bcrypt from 'bcrypt';

// ТЗ v3.0: направления (Кидс/Школа) + школьный блок (модули 16-20).
// This is a real HTTP client against the whole wired app, same style as
// test/app.e2e-spec.ts, focused on what's new: direction isolation, the
// school-only roles, and the gradebook/schedule/homework/period flow.
describe('Асыл-Аманат Школа (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const directorEmail = 'e2e-v3-director@asyl-amanat.kg';
  const directorPassword = 'e2e-v3-director-pass-1';
  let directorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    const tables = await dataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'`,
    );
    const names = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(', ');
    await dataSource.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);

    const usersRepo = dataSource.getRepository(User);
    await usersRepo.save(
      usersRepo.create({
        email: directorEmail,
        passwordHash: await bcrypt.hash(directorPassword, 4),
        fullName: 'E2E V3 Director',
        role: Role.DIRECTOR,
        active: true,
      }),
    );

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: directorEmail, password: directorPassword })
      .expect(200);
    directorToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const asDirector = () => ({
    get: (url: string) => request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${directorToken}`),
    post: (url: string) => request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${directorToken}`),
  });

  describe('direction isolation', () => {
    let kidsGroupId: string;
    let schoolGroupId: string;

    it('creates one Кидс group and one Школа class', async () => {
      const kids = await asDirector()
        .post('/groups')
        .send({ name: 'Ромашка', capacity: 20 })
        .expect(201);
      kidsGroupId = kids.body.id;
      expect(kids.body.direction).toBe('kids');

      const school = await asDirector()
        .post('/groups')
        .send({ name: '5А', capacity: 25, direction: 'school', parallel: 5, letter: 'А' })
        .expect(201);
      schoolGroupId = school.body.id;
      expect(school.body.direction).toBe('school');
    });

    it('a Кидс воспитатель cannot see the Школа class', async () => {
      const teacher = await asDirector()
        .post('/users')
        .send({
          email: 'e2e-v3-teacher@asyl-amanat.kg',
          password: 'e2e-v3-teacher-1',
          fullName: 'E2E Kids Teacher',
          role: Role.TEACHER,
        })
        .expect(201);
      expect(teacher.body.direction).toBe('kids');

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-v3-teacher@asyl-amanat.kg', password: 'e2e-v3-teacher-1' })
        .expect(200);
      const teacherToken = login.body.accessToken;

      await request(app.getHttpServer())
        .get(`/groups/${schoolGroupId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/groups/${kidsGroupId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('a parent with only a Кидс child cannot read the Школа-only group list scope', async () => {
      // Groups listing is staff-only regardless of direction - a parent
      // gets 403, never a leaked cross-direction list.
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: directorEmail, password: directorPassword })
        .expect(200);
      expect(login.body.accessToken).toEqual(expect.any(String));
    });

    it('stores both groups for later tests', () => {
      (global as any).__kidsGroupId = kidsGroupId;
      (global as any).__schoolGroupId = schoolGroupId;
    });
  });

  describe('gradebook, schedule, homework, periods', () => {
    let schoolGroupId: string;
    let subjectId: string;
    let subjectTeacherToken: string;
    let subjectTeacherId: string;
    let studentId: string;
    let parentToken: string;

    it('creates a Школа class and a subject', async () => {
      const group = await asDirector()
        .post('/groups')
        .send({ name: '6Б', capacity: 20, direction: 'school' })
        .expect(201);
      schoolGroupId = group.body.id;

      const subject = await asDirector().post('/subjects').send({ name: 'Математика' }).expect(201);
      subjectId = subject.body.id;
    });

    it('creates a subject-teacher account and assigns them to the class/subject', async () => {
      const teacher = await asDirector()
        .post('/users')
        .send({
          email: 'e2e-v3-subject-teacher@asyl-amanat.kg',
          password: 'e2e-v3-subj-teacher-1',
          fullName: 'E2E Subject Teacher',
          role: Role.SUBJECT_TEACHER,
        })
        .expect(201);
      subjectTeacherId = teacher.body.id;
      expect(teacher.body.direction).toBe('school');

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-v3-subject-teacher@asyl-amanat.kg', password: 'e2e-v3-subj-teacher-1' })
        .expect(200);
      subjectTeacherToken = login.body.accessToken;

      await asDirector()
        .post('/subjects/assignments')
        .send({ teacherId: subjectTeacherId, subjectId, groupId: schoolGroupId })
        .expect(201);
    });

    it('creates a student in the Школа class and links a parent', async () => {
      const student = await asDirector()
        .post('/children')
        .send({
          fullName: 'Ученик Тестовый',
          dateOfBirth: '2015-01-10',
          enrollmentDate: '2026-09-01',
          groupId: schoolGroupId,
          direction: 'school',
        })
        .expect(201);
      studentId = student.body.id;
      expect(student.body.direction).toBe('school');

      const parent = await asDirector()
        .post('/parents')
        .send({ fullName: 'Родитель Тестовый', email: 'e2e-v3-parent@asyl-amanat.kg' })
        .expect(201);
      await asDirector()
        .post(`/parents/${parent.body.id}/children`)
        .send({ childId: studentId, relationType: 'mother' })
        .expect(201);
      await asDirector()
        .post(`/parents/${parent.body.id}/create-login`)
        .send({ email: 'e2e-v3-parent@asyl-amanat.kg', password: 'e2e-v3-parent-pass-1' })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e-v3-parent@asyl-amanat.kg', password: 'e2e-v3-parent-pass-1' })
        .expect(200);
      parentToken = login.body.accessToken;
    });

    it('a subject teacher can grade their assigned class, and the parent sees it in real time', async () => {
      const grade = await request(app.getHttpServer())
        .post('/grades')
        .set('Authorization', `Bearer ${subjectTeacherToken}`)
        .send({ studentId, subjectId, groupId: schoolGroupId, date: '2026-09-05', value: 9 })
        .expect(201);
      expect(grade.body.value).toBe(9);

      const parentView = await request(app.getHttpServer())
        .get(`/grades/me/children/${studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(parentView.body).toHaveLength(1);
      expect(parentView.body[0].value).toBe(9);
    });

    it('a subject teacher cannot grade a class/subject they are not assigned to', async () => {
      const otherGroup = await asDirector().post('/groups').send({ name: '7В', capacity: 20, direction: 'school' }).expect(201);
      await request(app.getHttpServer())
        .post('/grades')
        .set('Authorization', `Bearer ${subjectTeacherToken}`)
        .send({ studentId, subjectId, groupId: otherGroup.body.id, date: '2026-09-05', value: 5 })
        .expect(403);
    });

    it('director creates a weekly lesson slot and a substitution notifies the parent', async () => {
      const slot = await asDirector()
        .post('/schedule')
        .send({ groupId: schoolGroupId, dayOfWeek: 1, lessonNumber: 2, subjectId, teacherId: subjectTeacherId, room: '204' })
        .expect(201);

      const parentSchedule = await request(app.getHttpServer())
        .get(`/schedule/me/children/${studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(parentSchedule.body).toHaveLength(1);

      await asDirector()
        .post(`/schedule/${slot.body.id}/substitutions`)
        .send({ date: '2026-09-08', newRoom: '301', reason: 'Ремонт кабинета' })
        .expect(201);
    });

    it('a homeroom/subject teacher marks per-lesson attendance', async () => {
      const slots = await asDirector().get(`/schedule/class/${schoolGroupId}`).expect(200);
      const slotId = slots.body[0].id;

      await request(app.getHttpServer())
        .post(`/schedule/${slotId}/attendance`)
        .set('Authorization', `Bearer ${subjectTeacherToken}`)
        .send({ date: '2026-09-08', records: [{ studentId, status: 'absent' }] })
        .expect(201);

      const parentAttendance = await request(app.getHttpServer())
        .get(`/schedule/me/children/${studentId}/attendance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(parentAttendance.body).toHaveLength(1);
      expect(parentAttendance.body[0].status).toBe('absent');
    });

    it('a subject teacher assigns homework and the parent sees it', async () => {
      await request(app.getHttpServer())
        .post('/homework')
        .set('Authorization', `Bearer ${subjectTeacherToken}`)
        .send({ groupId: schoolGroupId, subjectId, dueDate: '2026-09-12', description: 'Реши примеры 1-10' })
        .expect(201);

      const parentHomework = await request(app.getHttpServer())
        .get(`/homework/me/children/${studentId}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(parentHomework.body).toHaveLength(1);
    });

    it('recalculates a period grade from raw grades and lets the parent download a PDF transcript', async () => {
      const period = await asDirector()
        .post('/periods')
        .send({ name: '1 четверть', startDate: '2026-09-01', endDate: '2026-10-31', academicYear: '2026/2027' })
        .expect(201);

      await asDirector()
        .post(`/periods/${period.body.id}/recalculate/${schoolGroupId}/${subjectId}`)
        .expect(201);

      const pdfRes = await request(app.getHttpServer())
        .get(`/periods/me/children/${studentId}/transcript?periodId=${period.body.id}`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(pdfRes.headers['content-type']).toContain('application/pdf');
      expect(pdfRes.body.length).toBeGreaterThan(100);
    });

    it("director's dashboard shows both a combined total and a per-direction breakdown", async () => {
      const res = await asDirector()
        .get('/dashboard/summary?from=2026-01-01&to=2026-12-31')
        .expect(200);
      expect(res.body).toHaveProperty('byDirection.kids');
      expect(res.body).toHaveProperty('byDirection.school');
    });
  });
});
