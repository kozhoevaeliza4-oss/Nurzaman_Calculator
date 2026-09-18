import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { AdminUser } from '../auth/admin-user.entity';

// ТЗ: единственный владелец/администратор - создаётся один раз из
// ADMIN_EMAIL/ADMIN_PASSWORD, а не через открытую регистрацию.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment');
  }

  const dataSource = await AppDataSource.initialize();
  const repo = dataSource.getRepository(AdminUser);

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists — skipping.`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await repo.save(repo.create({ email, passwordHash, fullName: 'Владелец' }));
  console.log(`Admin user ${email} created.`);

  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
