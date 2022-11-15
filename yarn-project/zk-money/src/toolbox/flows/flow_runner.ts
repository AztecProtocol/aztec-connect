import createDebug from 'debug';
import { Obs } from '../../app/util/index.js';
import { CancelledError, createThrowIfCancelled, Flow } from './flows_utils.js';

const debug = createDebug('zm:flow_runner');

export interface FlowRunnerState<TEmitted> {
  running?: boolean;
  finished?: boolean;
  flowState?: TEmitted;
  error?: Error;
  cancelled?: boolean;
  cancel?: () => void;
}
export class FlowRunner<TArgs extends unknown[], TEmitted, TReturn> {
  stateObs = Obs.input<FlowRunnerState<TEmitted>>({});
  constructor(private readonly flow: Flow<TArgs, TEmitted, TReturn>) {}

  reset() {
    this.stateObs.next({});
  }

  async run(...args: TArgs) {
    const { throwIfCancelled, cancel } = createThrowIfCancelled();
    this.stateObs.next({ running: true, cancel });
    try {
      const result = await this.flow(
        flowState => this.stateObs.next({ running: true, flowState, cancel }),
        throwIfCancelled,
        ...args,
      );
      this.stateObs.next({ finished: true });
      return result;
    } catch (error) {
      if (error instanceof CancelledError) {
        this.stateObs.next({ cancelled: true });
      } else {
        debug('FlowRunner caught throw:', error);
        this.stateObs.next({ error });
        throw error;
      }
    }
  }
}
