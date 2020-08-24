import { fromErc20Units } from './units';

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
});
