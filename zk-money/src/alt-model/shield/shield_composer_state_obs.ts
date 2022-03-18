import { Obs } from 'app/util';
import { IObs } from 'app/util/obs/types';

export enum ShieldComposerPhase {
  IDLE = 'IDLE',
  DEPOSIT = 'DEPOSIT',
  CREATE_PROOF = 'CREATE_PROOF',
  APPROVE_PROOF = 'APPROVE_PROOF',
  SEND_PROOF = 'SEND_PROOF',
  DONE = 'DONE',
}
export interface ShieldComposerState {
  phase: ShieldComposerPhase;
  error?: { phase: ShieldComposerPhase; message: string };
  prompt?: string;
}

export class ShieldComposerStateObs implements IObs<ShieldComposerState> {
  obs = Obs.input<ShieldComposerState>({ phase: ShieldComposerPhase.IDLE });

  get value() {
    return this.obs.value;
  }

  listen = this.obs.listen.bind(this.obs);

  setPhase(phase: ShieldComposerPhase) {
    this.obs.next({ ...this.obs.value, phase });
  }

  clearError() {
    this.obs.next({ ...this.obs.value, error: undefined });
  }

  setPrompt = (prompt: string) => {
    this.obs.next({ ...this.obs.value, prompt });
  };

  clearPrompt() {
    this.obs.next({ ...this.obs.value, prompt: undefined });
  }

  error(message: string) {
    const error = { phase: this.obs.value.phase, message };
    this.obs.next({ phase: ShieldComposerPhase.IDLE, error });
  }
}
