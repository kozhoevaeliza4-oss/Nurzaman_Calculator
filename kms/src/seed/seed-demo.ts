import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../users/user.entity';
import { Role } from '../common/roles.enum';
import { Group } from '../groups/group.entity';
import { Child, ChildStatus } from '../children/child.entity';
import { Parent } from '../parents/parent.entity';
import { ChildParent, RelationType } from '../parents/child-parent.entity';
import { Tariff } from '../finance/tariff.entity';
import { MenuItem, MealType } from '../menu/menu-item.entity';
import { ExpenseCategory } from '../expenses/expense-category.entity';
import { randomBytes } from 'crypto';

// Optional, idempotent demo data on top of seed-director: a couple of
// groups/staff/children/parents/a tariff/a menu day/expense categories —
// enough to click around the API and see real responses instead of empty
// lists. Safe to re-run; skips anything that already exists by a fixed
// marker email/name. Not meant for production data.
// Usage: npx ts-node src/seed/seed-demo.ts
async function main() {
  await AppDataSource.initialize();

  const usersRepo = AppDataSource.getRepository(User);
  const groupsRepo = AppDataSource.getRepository(Group);
  const childrenRepo = AppDataSource.getRepository(Child);
  const parentsRepo = AppDataSource.getRepository(Parent);
  const linksRepo = AppDataSource.getRepository(ChildParent);
  const tariffsRepo = AppDataSource.getRepository(Tariff);
  const menuRepo = AppDataSource.getRepository(MenuItem);
  const categoriesRepo = AppDataSource.getRepository(ExpenseCategory);

  const existingGroup = await groupsRepo.findOne({ where: { name: 'Ромашка' } });
  if (existingGroup) {
    console.log('Demo data already present, nothing to do.');
    await AppDataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('Demo12345!', 10);

  const teacher = await usersRepo.save(
    usersRepo.create({
      email: 'teacher.demo@asyl-amanat.kg',
      passwordHash,
      fullName: 'Айгуль Демо',
      role: Role.TEACHER,
      active: true,
    }),
  );

  const group = await groupsRepo.save(
    groupsRepo.create({ name: 'Ромашка', capacity: 20, teacherId: teacher.id }),
  );
  await usersRepo.update(teacher.id, { groupId: group.id });

  await tariffsRepo.save(
    tariffsRepo.create({ groupId: group.id, amount: '8000.00', description: 'Стандартный тариф группы' }),
  );

  const child = await childrenRepo.save(
    childrenRepo.create({
      fullName: 'Демо Ребёнок',
      dateOfBirth: '2021-05-01',
      groupId: group.id,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      status: ChildStatus.ACTIVE,
      allergies: ['орехи'],
      qrCode: randomBytes(24).toString('base64url'),
    }),
  );

  const parentPasswordHash = await bcrypt.hash('Demo12345!', 10);
  const parentUser = await usersRepo.save(
    usersRepo.create({
      email: 'parent.demo@asyl-amanat.kg',
      passwordHash: parentPasswordHash,
      fullName: 'Родитель Демо',
      role: Role.PARENT,
      active: true,
    }),
  );
  const parent = await parentsRepo.save(
    parentsRepo.create({ fullName: 'Родитель Демо', phone: '+996700000000', userId: parentUser.id }),
  );
  await linksRepo.save(linksRepo.create({ childId: child.id, parentId: parent.id, relationType: RelationType.MOTHER }));

  const today = new Date().toISOString().slice(0, 10);
  await menuRepo.save([
    menuRepo.create({ date: today, mealType: MealType.BREAKFAST, dishName: 'Каша овсяная', allergens: [] }),
    menuRepo.create({ date: today, mealType: MealType.LUNCH, dishName: 'Суп с орехами', allergens: ['орехи'] }),
  ]);

  await categoriesRepo.save([
    categoriesRepo.create({ name: 'Зарплата' }),
    categoriesRepo.create({ name: 'Питание' }),
    categoriesRepo.create({ name: 'Коммунальные услуги' }),
  ]);

  console.log('Demo data created:');
  console.log('  teacher.demo@asyl-amanat.kg / Demo12345!');
  console.log('  parent.demo@asyl-amanat.kg / Demo12345!');
  console.log(`  group "Ромашка", 1 child (allergic to орехи), tariff 8000, today's menu with a matching warning`);

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
