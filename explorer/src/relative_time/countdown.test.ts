import moment from 'moment';
import { getDiff } from './countdown';

describe('Get time diff', () => {
  it('return the diff value, unit, and the wait time for updating to the next value.', () => {
    const now = moment();

    expect(getDiff(now.clone(), now)).toEqual({
      diff: 0,
      value: 0,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(1, 'second'), now)).toEqual({
      diff: 1,
      value: 1,
      unit: 'sec',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(2, 'seconds'), now)).toEqual({
      diff: 2,
      value: 2,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(59, 'seconds'), now)).toEqual({
      diff: 59,
      value: 59,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(60, 'seconds'), now)).toEqual({
      diff: 60,
      value: 1,
      unit: 'min',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(61, 'seconds'), now)).toEqual({
      diff: 61,
      value: 1,
      unit: 'min',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(62, 'seconds'), now)).toEqual({
      diff: 62,
      value: 1,
      unit: 'min',
      updateIn: 2,
    });

    expect(getDiff(now.clone().add(119, 'seconds'), now)).toEqual({
      diff: 119,
      value: 1,
      unit: 'min',
      updateIn: 59,
    });

    expect(getDiff(now.clone().add(120, 'seconds'), now)).toEqual({
      diff: 120,
      value: 2,
      unit: 'mins',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(121, 'seconds'), now)).toEqual({
      diff: 121,
      value: 2,
      unit: 'mins',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(1, 'hour').subtract(1, 'second'), now)).toEqual({
      diff: 3600 - 1,
      value: 59,
      unit: 'mins',
      updateIn: 59,
    });

    expect(getDiff(now.clone().add(1, 'hour'), now)).toEqual({
      diff: 3600,
      value: 1,
      unit: 'hour',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(1, 'hour').add(1, 'minute').add(1, 'second'), now)).toEqual({
      diff: 3600 + 60 + 1,
      value: 1,
      unit: 'hour',
      updateIn: 60 + 1,
    });

    expect(getDiff(now.clone().add(1, 'day').subtract(1, 'second'), now)).toEqual({
      diff: 86400 - 1,
      value: 23,
      unit: 'hours',
      updateIn: 3600 - 1,
    });

    expect(getDiff(now.clone().add(1, 'day'), now)).toEqual({
      diff: 86400,
      value: 1,
      unit: 'day',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(1, 'day').add(1, 'seconds'), now)).toEqual({
      diff: 86400 + 1,
      value: 1,
      unit: 'day',
      updateIn: 1,
    });
  });

  it('return correct values if target time is before current time.', () => {
    const now = moment();

    expect(getDiff(now.clone().subtract(1, 'second'), now)).toEqual({
      diff: -1,
      value: 1,
      unit: 'sec',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(2, 'seconds'), now)).toEqual({
      diff: -2,
      value: 2,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(59, 'seconds'), now)).toEqual({
      diff: -59,
      value: 59,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(60, 'seconds'), now)).toEqual({
      diff: -60,
      value: 1,
      unit: 'min',
      updateIn: 60,
    });

    expect(getDiff(now.clone().subtract(61, 'seconds'), now)).toEqual({
      diff: -61,
      value: 1,
      unit: 'min',
      updateIn: 59,
    });

    expect(getDiff(now.clone().subtract(119, 'seconds'), now)).toEqual({
      diff: -119,
      value: 1,
      unit: 'min',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(120, 'seconds'), now)).toEqual({
      diff: -120,
      value: 2,
      unit: 'mins',
      updateIn: 60,
    });

    expect(getDiff(now.clone().subtract(121, 'seconds'), now)).toEqual({
      diff: -121,
      value: 2,
      unit: 'mins',
      updateIn: 59,
    });

    expect(getDiff(now.clone().subtract(1, 'hour').add(1, 'second'), now)).toEqual({
      diff: -3600 + 1,
      value: 59,
      unit: 'mins',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(1, 'hour'), now)).toEqual({
      diff: -3600,
      value: 1,
      unit: 'hour',
      updateIn: 3600,
    });

    expect(getDiff(now.clone().subtract(1, 'hour').subtract(1, 'minute').subtract(1, 'second'), now)).toEqual({
      diff: -(3600 + 60 + 1),
      value: 1,
      unit: 'hour',
      updateIn: 3600 - (60 + 1),
    });
  });

  it('take custom gaps', () => {
    const now = moment();

    expect(getDiff(now.clone().add(120, 'seconds'), now, [86400, 3600, 120, 0])).toEqual({
      diff: 120,
      value: 2,
      unit: 'mins',
      updateIn: 1,
    });

    expect(getDiff(now.clone().add(119, 'seconds'), now, [86400, 3600, 120, 0])).toEqual({
      diff: 119,
      value: 119,
      unit: 'secs',
      updateIn: 1,
    });

    expect(getDiff(now.clone().subtract(120, 'seconds'), now, [86400, 3600, 120, 0])).toEqual({
      diff: -120,
      value: 2,
      unit: 'mins',
      updateIn: 60,
    });

    expect(getDiff(now.clone().subtract(119, 'seconds'), now, [86400, 3600, 120, 0])).toEqual({
      diff: -119,
      value: 119,
      unit: 'secs',
      updateIn: 1,
    });
  });
});
