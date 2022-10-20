import { roundUp } from './round_up';

describe('round_up', () => {
  it('round up big integers', () => {
    expect(roundUp(123n, 0)).toBe(123n);
    expect(roundUp(123n, 1)).toBe(200n);
    expect(roundUp(123n, 2)).toBe(130n);
    expect(roundUp(123n, 3)).toBe(123n);
    expect(roundUp(123n, 4)).toBe(123n);

    expect(roundUp(999n, 0)).toBe(999n);
    expect(roundUp(999n, 1)).toBe(1000n);
    expect(roundUp(999n, 2)).toBe(1000n);
    expect(roundUp(999n, 3)).toBe(999n);
  });

  it('throw if number of significant figures is negative', () => {
    expect(() => roundUp(123n, -1)).toThrow();
  });
});
