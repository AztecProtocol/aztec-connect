import { Proxify } from '../transport/index.js';
import { BarretenbergWasm } from './barretenberg_wasm.js';

export interface BarretenbergWorker extends Proxify<BarretenbergWasm> {
  destroyWorker(): Promise<void>;
}
