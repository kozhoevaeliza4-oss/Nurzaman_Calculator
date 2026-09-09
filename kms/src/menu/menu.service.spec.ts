import { MenuService } from './menu.service';

describe('MenuService.allergyWarningsForDate', () => {
  function makeService(items: unknown[], children: unknown[]) {
    const repo = { find: jest.fn().mockResolvedValue(items) };
    const childrenService = { findAll: jest.fn().mockResolvedValue(children) };
    const service = new MenuService(repo as any, childrenService as any);
    return { service, repo, childrenService };
  }

  it('returns nothing for a dish with no allergens at all', async () => {
    const items = [{ id: 'm1', dishName: 'Каша', allergens: [] }];
    const children = [{ id: 'c1', fullName: 'A', allergies: ['орехи'], groupId: 'g1' }];
    const { service } = makeService(items, children);

    expect(await service.allergyWarningsForDate('2024-09-10')).toEqual([]);
  });

  it('flags a child whose allergy list overlaps the dish allergens', async () => {
    const items = [{ id: 'm1', dishName: 'Суп с орехами', allergens: ['орехи', 'молоко'] }];
    const children = [
      { id: 'c1', fullName: 'Аллергик', allergies: ['орехи'], groupId: 'g1' },
      { id: 'c2', fullName: 'Не аллергик', allergies: ['цитрусовые'], groupId: 'g1' },
    ];
    const { service } = makeService(items, children);

    const warnings = await service.allergyWarningsForDate('2024-09-10');

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      childId: 'c1',
      childFullName: 'Аллергик',
      matchedAllergens: ['орехи'],
    });
  });

  it('lists every matched allergen, not just the first', async () => {
    const items = [{ id: 'm1', dishName: 'Блюдо', allergens: ['орехи', 'молоко', 'яйца'] }];
    const children = [{ id: 'c1', fullName: 'X', allergies: ['молоко', 'орехи'], groupId: null }];
    const { service } = makeService(items, children);

    const warnings = await service.allergyWarningsForDate('2024-09-10');

    expect(warnings[0].matchedAllergens.sort()).toEqual(['молоко', 'орехи']);
  });

  it('checks against every active child, independent of group', async () => {
    const items = [{ id: 'm1', dishName: 'Блюдо', allergens: ['глютен'] }];
    const children = [{ id: 'c1', fullName: 'X', allergies: ['глютен'], groupId: 'other-group' }];
    const { service, childrenService } = makeService(items, children);

    const warnings = await service.allergyWarningsForDate('2024-09-10');

    expect(childrenService.findAll).toHaveBeenCalledWith({ status: 'active' });
    expect(warnings).toHaveLength(1);
  });
});
