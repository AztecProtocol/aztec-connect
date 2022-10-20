import { createLogger } from '@aztec/barretenberg/log';

interface ValueForDate {
  time: Date;
  value: number;
}

const MILLISECONDS_IN_DAY = 86400 * 1000;
const MIDNIGHT_THRESHOLD = 60 * 1000; // set to 1 minute

export class RateLimiter {
  private values: { [key: string]: ValueForDate } = {};
  constructor(private limitPerDay: number, private log = createLogger('RateLimiter')) {
    this.setDailyTimeout();
  }

  configureLimit(limitPerDay: number) {
    this.limitPerDay = limitPerDay;
  }

  add(identifier: string, quantity = 1) {
    // always return true for quantity <= 0
    if (quantity <= 0) {
      return true;
    }

    // check
    this.checkAndRefresh(identifier);
    const newQuantity = this.values[identifier].value + quantity;
    if (newQuantity > this.limitPerDay) {
      return false;
    }
    this.values[identifier].value = newQuantity;
    return true;
  }

  getCurrentValue(identifier: string) {
    this.checkAndRefresh(identifier);
    return this.values[identifier].value;
  }

  private checkAndRefresh(identifier: string) {
    // if we don't have a store for the given identifier
    // or the time of the store for the identifier is a different date from today
    // refresh the store for the given identifier
    const storedValue = this.values[identifier];
    const currentTime = new Date();
    if (!storedValue || this.isNewDay(storedValue.time, currentTime)) {
      this.values[identifier] = { time: currentTime, value: 0 };
    }
  }

  private isNewDay(oldDate: Date, newDate: Date) {
    // compare the number of whole days since the unix epoch
    const oldDays = Math.floor(oldDate.getTime() / MILLISECONDS_IN_DAY);
    const newDays = Math.floor(newDate.getTime() / MILLISECONDS_IN_DAY);
    return oldDays !== newDays;
  }

  private processDailyTimer() {
    this.log('Clearing rate limiter cache...');
    this.values = {};
  }

  private setDailyTimeout() {
    const interval = this.getIntervalForNextTimeout();
    setTimeout(() => {
      this.processDailyTimer();
      this.setDailyTimeout();
    }, interval);
  }

  private getIntervalForNextTimeout() {
    // find out the current time and set a timeout at the next midnight
    // if withn MIDNIGHT_THRESHOLD seconds of the next midnight then set it to the following midnight
    const currentTime = new Date().getTime();
    const nextMidnight = (Math.floor(currentTime / MILLISECONDS_IN_DAY) + 1) * MILLISECONDS_IN_DAY;
    const msToNextMidnight = nextMidnight - currentTime;
    return msToNextMidnight > MIDNIGHT_THRESHOLD ? msToNextMidnight : msToNextMidnight + MILLISECONDS_IN_DAY;
  }
}
