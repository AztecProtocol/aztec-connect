import { PublishTimeManager } from './publish_time_manager.js';
import { jest } from '@jest/globals';

jest.useFakeTimers({ doNotFake: ['performance'] });

const currentTime = '2021-11-11T09:30:00+00:00';
const rollupTimeoutDurationSecs = 3600;
const getCurrentTime = () => currentTime;
const stringToDate = (dateAsString: string) => new Date(dateAsString);

describe('PublishTimeManager', () => {
  let manager: PublishTimeManager;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => {
      return stringToDate(getCurrentTime()).getTime();
    });

    // rollup timeout is hourly
    manager = new PublishTimeManager(rollupTimeoutDurationSecs);
  });

  it('gives correct base timeouts', () => {
    let rollupTimeouts = manager.calculateLastTimeouts();
    expect(rollupTimeouts.baseTimeout).toEqual({
      timeout: stringToDate('2021-11-11T09:00:00+00:00'),
      rollupNumber: 454617,
    });

    rollupTimeouts = manager.calculateNextTimeouts();
    expect(rollupTimeouts.baseTimeout).toEqual({
      timeout: stringToDate('2021-11-11T10:00:00+00:00'),
      rollupNumber: 454618,
    });
  });

  it('gives no timeout if publish interval is less than 1', () => {
    manager = new PublishTimeManager(0.9);
    let rollupTimeouts = manager.calculateLastTimeouts();
    expect(rollupTimeouts.baseTimeout).toBeUndefined();

    rollupTimeouts = manager.calculateNextTimeouts();
    expect(rollupTimeouts.baseTimeout).toBeUndefined();
  });

  it('gives no timeout if publish interval is 0', () => {
    manager = new PublishTimeManager(0);
    let rollupTimeouts = manager.calculateLastTimeouts();
    expect(rollupTimeouts.baseTimeout).toBeUndefined();

    rollupTimeouts = manager.calculateNextTimeouts();
    expect(rollupTimeouts.baseTimeout).toBeUndefined();
  });
});
