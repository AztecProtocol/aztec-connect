import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

type EmitterCleanup = (() => void) | undefined | void;
export type Emitter<TEmitted> = (emit: (value: TEmitted) => void) => EmitterCleanup;

export class EmitterObs<TEmitted> extends BaseObs<TEmitted> {
  constructor(private readonly emitter: Emitter<TEmitted>, initialValue: TEmitted) {
    super(initialValue);
  }

  private cleanup?: EmitterCleanup;
  private emit = this.setAndEmit.bind(this);

  protected didReceiveFirstListener(): void {
    this.cleanup = this.emitter(this.emit);
  }

  protected didLoseLastListener(): void {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
  }
}
