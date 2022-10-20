import { RateLimiter } from './rate_limiter.js';
import { jest } from '@jest/globals';

let date = Date.parse('2022-10-10T09:30:00.000Z');
const currentDate = () => {
  return new Date(date);
};

const setNewDay = () => {
  const newDate = currentDate();
  newDate.setDate(newDate.getDate() + 1);
  date = newDate.getTime();
};

const createRateLimiter = (limit: number) => {
  return new RateLimiter(limit, () => {});
};

describe('Rate Limiter', () => {
  let spy: any;
  const realDate = global.Date;
  beforeEach(() => {
    //jest.spyOn(console, 'log').mockImplementation(() => {});

    spy = jest.spyOn(global, 'Date').mockImplementation((...args): any => {
      if (args.length) {
        return new realDate(...args);
      }
      return currentDate() as any;
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('can be constructed', () => {
    expect(() => new RateLimiter(10)).not.toThrow();
  });

  it('allows action if within limit', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(1);
  });

  it('allows multiple actions if within limit', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.add(id1, 3)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(3);
  });

  it('reject action if outside of limit', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    for (let i = 0; i < 5; i++) {
      expect(limiter.add(id1)).toBe(true);
      expect(limiter.getCurrentValue(id1)).toBe(i + 1);
    }
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);
  });

  it('adding 0 always allowed', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    for (let i = 0; i < 50; i++) {
      expect(limiter.add(id1, 0)).toBe(true);
      expect(limiter.getCurrentValue(id1)).toBe(0);
    }
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(1);
    for (let i = 0; i < 50; i++) {
      expect(limiter.add(id1, 0)).toBe(true);
      expect(limiter.getCurrentValue(id1)).toBe(1);
    }
  });

  it('adding negative always allowed and has not effect', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    for (let i = 0; i < 50; i++) {
      expect(limiter.add(id1, -1)).toBe(true);
      expect(limiter.getCurrentValue(id1)).toBe(0);
    }
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(1);
    for (let i = 0; i < 50; i++) {
      expect(limiter.add(id1, -1)).toBe(true);
      expect(limiter.getCurrentValue(id1)).toBe(1);
    }
  });

  it('reject actions if outside of limit', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.add(id1, 3)).toBe(true);
    expect(limiter.add(id1, 3)).toBe(false);
  });

  it('allows action if within limit', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(1);
  });

  it('value is reset on new day', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(1);

    setNewDay();
    expect(limiter.getCurrentValue(id1)).toBe(0);
  });

  it('value is reset at midnight utc', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    const id2 = 'id2';

    date = realDate.parse('2022-08-18T23:59:59.999Z');

    // go to the limit for the day
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.add(id1, 5)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(5);
    expect(limiter.getCurrentValue(id2)).toBe(0);
    expect(limiter.add(id2, 5)).toBe(true);
    expect(limiter.getCurrentValue(id2)).toBe(5);

    // ensure we can't go beyond the limit
    expect(limiter.add(id1, 1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);
    expect(limiter.add(id2, 1)).toBe(false);
    expect(limiter.getCurrentValue(id2)).toBe(5);

    // now go forward 1ms to the new day
    date = realDate.parse('2022-08-19T00:00:00.000Z');
    expect(limiter.getCurrentValue(id1)).toBe(0);
    expect(limiter.getCurrentValue(id2)).toBe(0);

    // another 5 actions should be permitted
    expect(limiter.add(id1, 2)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(2);
    expect(limiter.add(id2, 3)).toBe(true);
    expect(limiter.getCurrentValue(id2)).toBe(3);

    expect(limiter.add(id1, 3)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(5);
    expect(limiter.add(id2, 2)).toBe(true);
    expect(limiter.getCurrentValue(id2)).toBe(5);

    expect(limiter.add(id1, 1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);
    expect(limiter.add(id2, 1)).toBe(false);
    expect(limiter.getCurrentValue(id2)).toBe(5);
  });

  it('allows further actions on new day', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.add(id1, 5)).toBe(true);
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);

    setNewDay();
    expect(limiter.add(id1, 5)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(5);
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);
  });

  it('applies limits per id', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    const id2 = 'id2';
    expect(limiter.add(id1, 3)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(3);
    expect(limiter.add(id2, 3)).toBe(true);
    expect(limiter.getCurrentValue(id2)).toBe(3);
    expect(limiter.add(id1, 3)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(3);
    expect(limiter.add(id2, 2)).toBe(true);
    expect(limiter.getCurrentValue(id2)).toBe(5);
  });

  it('allows limit to be changed', () => {
    const limiter = createRateLimiter(5);
    const id1 = 'id1';
    expect(limiter.add(id1, 5)).toBe(true);
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(5);

    limiter.configureLimit(10);

    // can add another 5
    expect(limiter.add(id1, 5)).toBe(true);
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(10);

    // increase again
    limiter.configureLimit(13);
    expect(limiter.add(id1)).toBe(true);
    expect(limiter.getCurrentValue(id1)).toBe(11);

    // reduce back down
    limiter.configureLimit(10);
    expect(limiter.add(id1)).toBe(false);
    expect(limiter.getCurrentValue(id1)).toBe(11);
  });
});
