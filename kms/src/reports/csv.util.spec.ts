import { toCsv } from './csv.util';

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('writes a header row from the first object\'s keys, then one line per row', () => {
    const csv = toCsv([
      { childFullName: 'Аяжан', eventType: 'check_in' },
      { childFullName: 'Бахтияр', eventType: 'check_out' },
    ]);
    expect(csv).toBe(
      'childFullName,eventType\nАяжан,check_in\nБахтияр,check_out',
    );
  });

  it('quotes and escapes a value containing a comma', () => {
    const csv = toCsv([{ note: 'Оплата, наличные' }]);
    expect(csv).toBe('note\n"Оплата, наличные"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const csv = toCsv([{ note: 'Сказал "привет"' }]);
    expect(csv).toBe('note\n"Сказал ""привет"""');
  });

  it('quotes a value containing a newline', () => {
    const csv = toCsv([{ note: 'строка1\nстрока2' }]);
    expect(csv).toBe('note\n"строка1\nстрока2"');
  });

  it('renders null/undefined as an empty field, not the string "null"', () => {
    const csv = toCsv([{ a: null, b: undefined, c: 0 }]);
    expect(csv).toBe('a,b,c\n,,0');
  });
});
