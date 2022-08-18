interface ValueForDate {
  time: Date;
  value: number;
}

export class RateLimiter {
  private values: { [key: string]: ValueForDate } = {};
  constructor(private limitPerDay: number) {}

  configureLimit(limitPerDay: number) {
    this.limitPerDay = limitPerDay;
  }

  add(identifier: string, quantity = 1) {
    // always return true for quantity === 0
    if (quantity === 0) {
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
    const milliSecondsInDay = 86400000;
    const oldDays = Math.floor(oldDate.getTime() / milliSecondsInDay);
    const newDays = Math.floor(newDate.getTime() / milliSecondsInDay);
    return oldDays !== newDays;
  }
}
