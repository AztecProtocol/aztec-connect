import { Obs } from 'app/util';
import { IObs } from 'app/util/obs/types';

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

  clearError() {
    this.obs.next({ ...this.obs.value, error: undefined });
  }

  error(message: string) {
    const error = { phase: this.obs.value.phase, message };
    this.obs.next({ phase: SendComposerPhase.IDLE, error });
  }
}
