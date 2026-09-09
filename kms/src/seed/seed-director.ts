import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../users/user.entity';
import { Role } from '../common/roles.enum';

// One-off bootstrap: creates the first director account so someone can log
// in and start creating everyone else through the API.
// Usage: DIRECTOR_EMAIL=... DIRECTOR_PASSWORD=... npx ts-node src/seed/seed-director.ts
async function main() {
  const email = process.env.DIRECTOR_EMAIL;
  const password = process.env.DIRECTOR_PASSWORD;
  const fullName = process.env.DIRECTOR_NAME || 'Director';

  if (!email || !password) {
    throw new Error('Set DIRECTOR_EMAIL and DIRECTOR_PASSWORD environment variables');
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);

  const existing = await repo.findOne({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, nothing to do.`);
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await repo.save(repo.create({ email, passwordHash, fullName, role: Role.DIRECTOR, active: true }));

  console.log(`Created director account: ${email}`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
