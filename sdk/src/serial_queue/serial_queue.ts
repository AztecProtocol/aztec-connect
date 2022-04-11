export interface SerialQueue {
  length(): number;
  push<T>(fn: () => Promise<T>): Promise<T>;
  destroy(): Promise<void>;
}
