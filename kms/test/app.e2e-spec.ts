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

// A real HTTP client against the real, fully-wired app (guards, pipes,
// filters, and a real Postgres database) — this is what caught the
// TypeORM "Object is not a supported type" bug the unit tests (mocked
// repositories) never could, because it only shows up when TypeORM
// actually reads entity metadata to talk to a database.
describe('Асыл-Аманат KMS (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const directorEmail = 'e2e-director@asyl-amanat.kg';
  const directorPassword = 'e2e-director-pass-1';
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

    // Clean slate: truncate every domain table (never `migrations`) so
    // repeated runs don't collide on unique constraints.
    const tables = await dataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'`,
    );
    const names = tables.map((t: { tablename: string }) => `"${t.tablename}"`).join(', ');
    await dataSource.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);

    // Seed one director the same way seed-director.ts does, so login has
    // something real to authenticate against.
    const usersRepo = dataSource.getRepository(User);
    await usersRepo.save(
      usersRepo.create({
        email: directorEmail,
        passwordHash: await bcrypt.hash(directorPassword, 4),
        fullName: 'E2E Director',
        role: Role.DIRECTOR,
        active: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request(app.getHttpServer()).get('/children').expect(401);
    expect(res.body).toMatchObject({ statusCode: 401 });
    expect(res.body).toHaveProperty('path', '/children');
  });

  it('rejects bad login credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: directorEmail, password: 'wrong-password' })
      .expect(401);
  });

  it('logs the director in and returns a usable JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: directorEmail, password: directorPassword })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: directorEmail, role: Role.DIRECTOR });
    directorToken = res.body.accessToken;
  });

  it('rejects a request with a malformed body with a consistent error shape', async () => {
    const res = await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ name: 'Ромашка' }) // missing required "capacity"
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400, path: '/groups' });
    expect(res.body).toHaveProperty('timestamp');
  });

  it('enforces RBAC: a teacher cannot create staff accounts', async () => {
    // Director creates a teacher account.
    const teacherEmail = 'e2e-teacher@asyl-amanat.kg';
    const teacherPassword = 'e2e-teacher-pass-1';
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ email: teacherEmail, password: teacherPassword, fullName: 'E2E Teacher', role: Role.TEACHER })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: teacherEmail, password: teacherPassword })
      .expect(200);
    const teacherToken = loginRes.body.accessToken;

    // A teacher is not director/admin — creating another user must be refused.
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ email: 'nope@asyl-amanat.kg', password: 'whatever123', fullName: 'Nope', role: Role.TEACHER })
      .expect(403);
  });

  describe('full lifecycle: group -> child -> parent -> tariff -> payment -> balance', () => {
    let groupId: string;
    let childId: string;
    let parentRecordId: string;
    const parentEmail = 'e2e-parent@asyl-amanat.kg';
    const parentPassword = 'e2e-parent-pass-1';
    let parentToken: string;

    it('creates a group', async () => {
      const res = await request(app.getHttpServer())
        .post('/groups')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ name: 'Ромашка', capacity: 20 })
        .expect(201);
      groupId = res.body.id;
      expect(groupId).toEqual(expect.any(String));
    });

    it('creates a child in that group, with a generated QR code', async () => {
      const res = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          fullName: 'Тестовый Ребёнок',
          dateOfBirth: '2021-01-15',
          groupId,
          enrollmentDate: '2024-09-01',
          allergies: ['орехи'],
        })
        .expect(201);
      childId = res.body.id;
      expect(res.body.qrCode).toEqual(expect.any(String));
      expect(res.body.allergies).toEqual(['орехи']);
    });

    it('lists children with pagination metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/children')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 25 });
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.items.some((c: { id: string }) => c.id === childId)).toBe(true);
    });

    it('creates a parent, links the child, and provisions a login', async () => {
      const parentRes = await request(app.getHttpServer())
        .post('/parents')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ fullName: 'Тестовый Родитель', phone: '+996700000001' })
        .expect(201);
      parentRecordId = parentRes.body.id;

      await request(app.getHttpServer())
        .post(`/parents/${parentRecordId}/children`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ childId, relationType: 'mother' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/parents/${parentRecordId}/create-login`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ email: parentEmail, password: parentPassword })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: parentEmail, password: parentPassword })
        .expect(200);
      parentToken = loginRes.body.accessToken;
    });

    it('a parent sees their own child via /parents/me/children', async () => {
      const res = await request(app.getHttpServer())
        .get('/parents/me/children')
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].childId).toBe(childId);
    });

    it('sets a tariff for the group and accrues a monthly charge', async () => {
      await request(app.getHttpServer())
        .post('/finance/tariffs')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ groupId, amount: '8000.00' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/finance/groups/${groupId}/accrue-monthly`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ dueDate: '2024-09-01' })
        .expect(201);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].amount).toBe('8000.00');
    });

    it('shows the accrued charge as debt before any payment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/finance/children/${childId}/balance`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(res.body).toEqual({ charged: '8000.00', paid: '0.00', debt: '8000.00' });
    });

    it('records a payment and generates a sequentially-numbered receipt', async () => {
      const res = await request(app.getHttpServer())
        .post('/finance/payments')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ childId, amount: '5000.00', method: 'cash', paidAt: '2024-09-05' })
        .expect(201);
      expect(res.body.receipt.receiptNumber).toEqual(expect.any(String));
      expect(res.body.payment.amount).toBe('5000.00');
    });

    it('the debt now reflects the partial payment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/finance/children/${childId}/balance`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(res.body).toEqual({ charged: '8000.00', paid: '5000.00', debt: '3000.00' });
    });

    it("the parent can see their own child's balance", async () => {
      const res = await request(app.getHttpServer())
        .get(`/finance/me/children/${childId}/balance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(200);
      expect(res.body.debt).toBe('3000.00');
    });

    it("a parent cannot see a different, unrelated child's balance", async () => {
      const otherChildRes = await request(app.getHttpServer())
        .post('/children')
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          fullName: 'Чужой Ребёнок',
          dateOfBirth: '2020-06-01',
          groupId,
          enrollmentDate: '2024-09-01',
        })
        .expect(201);
      const otherChildId = otherChildRes.body.id;

      await request(app.getHttpServer())
        .get(`/finance/me/children/${otherChildId}/balance`)
        .set('Authorization', `Bearer ${parentToken}`)
        .expect(403);
    });

    it('uploads a real multipart document and downloads the exact bytes back', async () => {
      const fileContent = Buffer.from('свидетельство о рождении (fake, for a test)');

      const uploadRes = await request(app.getHttpServer())
        .post(`/documents/children/${childId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .field('type', 'birth_certificate')
        .attach('file', fileContent, { filename: 'birth-certificate.pdf', contentType: 'application/pdf' })
        .expect(201);
      expect(uploadRes.body.fileName).toBe('birth-certificate.pdf');

      const downloadRes = await request(app.getHttpServer())
        .get(`/documents/${uploadRes.body.id}/download`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(downloadRes.headers['content-type']).toContain('application/pdf');
      expect(Buffer.compare(downloadRes.body, fileContent)).toBe(0);
    });

    it('the director dashboard aggregates income, debt and free spots', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary?from=2024-09-01&to=2024-09-30')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(res.body.income).toBe('5000.00');
      expect(res.body.debt.total).toBe('3000.00');
      const group = res.body.freeSpots.find((g: { groupId: string }) => g.groupId === groupId);
      expect(group).toMatchObject({ capacity: 20, occupied: 2, freeSpots: 18 });
    });

    it("appears in the director's audit log", async () => {
      const res = await request(app.getHttpServer())
        .get('/audit?entityType=payment')
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.items[0]).toMatchObject({ action: 'create', entityType: 'payment' });
    });
  });
});
