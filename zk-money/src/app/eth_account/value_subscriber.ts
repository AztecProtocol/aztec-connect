import EventEmitter from 'events';

export enum ValueSubscriberEvent {
  UPDATED_VALUE = 'UPDATED_VALUE',
}

export interface ValueSubscriber {
  on(event: ValueSubscriberEvent.UPDATED_VALUE, listener: (value: bigint) => void): this;
}

export class ValueSubscriber extends EventEmitter {
  private state = {
    value: 0n,
    lastSynced: 0,
  };

  private subscriber?: number;

  constructor(private readonly interval: number) {
    super();
    this.subscribe();
  }

  get value() {
    return this.state.value;
  }

  get outdated() {
    return Date.now() - this.state.lastSynced > this.interval;
  }

  destroy() {
    this.unsubscribe();
  }

  async refresh(forceUpdate = true) {
    if (forceUpdate || this.outdated) {
      this.unsubscribe();
      await this.updateValue();
      await this.subscribe();
    }
    return this.value;
  }

  protected async getValue() {
    return 0n;
  }

  private async updateValue() {
    const value = await this.getValue();
    this.state.lastSynced = Date.now();
    if (value !== this.value) {
      this.state.value = value;
      this.emit(ValueSubscriberEvent.UPDATED_VALUE, value);
    }
    return value;
  }

  private async subscribe() {
    if (this.subscriber !== undefined) {
      return;
    }

    const checkBalance = async () => {
      if (!this.listenerCount(ValueSubscriberEvent.UPDATED_VALUE)) return;

      await this.updateValue();
    };

    this.subscriber = window.setInterval(checkBalance, this.interval);
  }

  private unsubscribe() {
    clearInterval(this.subscriber);
    this.subscriber = undefined;
  }
}
