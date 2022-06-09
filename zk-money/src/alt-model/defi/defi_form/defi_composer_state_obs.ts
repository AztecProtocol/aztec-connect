import { Obs } from 'app/util';
import type { IObs } from 'app/util/obs/types';
import type { Retryable } from 'app/util/promises/retryable';

export enum DefiComposerPhase {
  IDLE = 'IDLE',
  GENERATING_KEY = 'GENERATING_KEY',
  CREATING_PROOF = 'CREATING_PROOF',
  SENDING_PROOF = 'SENDING_PROOF',
  DONE = 'DONE',
}

export interface DefiComposerState {
  phase: DefiComposerPhase;
  error?: { phase: DefiComposerPhase; message: string };
  signingRetryable?: Retryable<unknown>;
}

export class DefiComposerStateObs implements IObs<DefiComposerState> {
  obs = Obs.input<DefiComposerState>({ phase: DefiComposerPhase.IDLE });

  get value() {
    return this.obs.value;
  }

  listen = this.obs.listen.bind(this.obs);

  setPhase(phase: DefiComposerPhase) {
    this.obs.next({ ...this.obs.value, phase });
  }

  enableRetryableSigning(signingRetryable: Retryable<unknown>) {
    this.obs.next({ ...this.value, signingRetryable });
  }

  disableRetryableSigning() {
    this.obs.next({ ...this.value, signingRetryable: undefined });
  }

  clearError() {
    this.obs.next({ ...this.obs.value, error: undefined });
  }

  error(message: string) {
    const error = { phase: this.obs.value.phase, message };
    this.obs.next({ phase: DefiComposerPhase.IDLE, error });
  }
}
