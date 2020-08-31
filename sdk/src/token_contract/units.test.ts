import { fromErc20Units, toErc20Units } from './units';

describe('units', () => {
  it('should format correctly', () => {
    expect(fromErc20Units(0n, 4, 2)).toBe('0.00');
    expect(fromErc20Units(1299n, 4, 2)).toBe('0.12');
    expect(fromErc20Units(198765n, 4, 2)).toBe('19.87');
    expect(fromErc20Units(191111n, 4, 2)).toBe('19.11');
    expect(fromErc20Units(100000n, 4, 2)).toBe('10.00');
    expect(fromErc20Units(199999n, 4, 2)).toBe('19.99');
    expect(fromErc20Units(199000n, 4, 2)).toBe('19.90');
    expect(fromErc20Units(198765n, 4)).toBe('19.8765');
  });

  it('should convert string to bigint correctly', () => {
    expect(toErc20Units('0.0', 4)).toBe(0n);
    expect(toErc20Units('0', 4)).toBe(0n);
    expect(toErc20Units('', 4)).toBe(0n);
    expect(toErc20Units('.', 4)).toBe(0n);
    expect(toErc20Units('0.001', 3)).toBe(1n);
    expect(toErc20Units('0.1299', 4)).toBe(1299n);
    expect(toErc20Units('.1299', 4)).toBe(1299n);
    expect(toErc20Units('0.1299', 3)).toBe(129n);
    expect(toErc20Units('0.1299', 1)).toBe(1n);
    expect(toErc20Units('12.34', 3)).toBe(12340n);
    expect(toErc20Units('12.0', 3)).toBe(12000n);
    expect(toErc20Units('12', 3)).toBe(12000n);
    expect(toErc20Units('12.34', 0)).toBe(12n);
  });
});
