import { Obs } from '../../app/util/index.js';
import type { IObs } from '../../app/util/obs/types.js';
import type { Retryable } from '../../app/util/promises/retryable.js';

export enum SendComposerPhase {
  IDLE = 'IDLE',
  GENERATING_KEY = 'GENERATING_KEY',
  CREATING_PROOF = 'CREATING_PROOF',
  SENDING_PROOF = 'SENDING_PROOF',
  DONE = 'DONE',
}

export interface SendComposerState {
  phase: SendComposerPhase;
  error?: { phase: SendComposerPhase; message: string };
  signingRetryable?: Retryable<unknown>;
}

export class SendComposerStateObs implements IObs<SendComposerState> {
  obs = Obs.input<SendComposerState>({ phase: SendComposerPhase.IDLE });

  get value() {
    return this.obs.value;
  }

  listen = this.obs.listen.bind(this.obs);

  setPhase(phase: SendComposerPhase) {
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
    this.obs.next({ phase: SendComposerPhase.IDLE, error });
  }
}
