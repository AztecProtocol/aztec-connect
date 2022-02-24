import { BaseObs } from './base_obs';
import { IObs, ObsUnlisten } from './types';

type EmitMapperCleanup = (() => void) | undefined;
export type EmitMapper<TDep, TEmitted> = (dep: TDep, emit: (value: TEmitted) => void) => EmitMapperCleanup;

export class EmitMapperObs<TDep, TEmitted> extends BaseObs<TEmitted> {
  constructor(
    private readonly depObs: IObs<TDep>,
    private readonly emitter: EmitMapper<TDep, TEmitted>,
    initialValue: TEmitted,
  ) {
    super(initialValue);
  }

  private cleanup?: EmitMapperCleanup;
  private emit = this.setAndEmit.bind(this);

  private nextEmitter = (dep: TDep) => {
    this.cleanup?.();
    this.cleanup = this.emitter(dep, this.emit);
  };

  private unlistenDep?: ObsUnlisten;

  protected didReceiveFirstListener(): void {
    this.nextEmitter(this.depObs.value);
    this.unlistenDep = this.depObs.listen(this.nextEmitter);
  }

  protected didLoseLastListener(): void {
    if (this.unlistenDep) {
      this.unlistenDep();
      this.unlistenDep = undefined;
    }
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
  }
}
