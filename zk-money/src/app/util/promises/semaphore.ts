import { Fullfiller } from './fullfiller';

class OpenValue<T> {
  constructor(readonly value: T) {}
}

export class Semaphore<T> {
  private fullfiller?: Fullfiller<T>;
  private openValue?: OpenValue<T>;

  wait = async () => {
    if (this.openValue) return this.openValue.value;
    if (!this.fullfiller) this.fullfiller = new Fullfiller();
    return this.fullfiller.promise;
  };

  open = (value: T) => {
    this.openValue = new OpenValue(value);
    if (this.fullfiller) {
      this.fullfiller.resolve(value);
      this.fullfiller = undefined;
    }
  };

  close = () => {
    this.openValue = undefined;
  };
}
