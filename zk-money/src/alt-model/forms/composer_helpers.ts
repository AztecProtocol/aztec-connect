import { withinTimeLimit } from 'app/util';
import { Retryable } from 'app/util/promises/retryable';

interface RetryableHost {
  enableRetryableSigning(signingRetryable: Retryable<unknown>): void;
  disableRetryableSigning(): void;
}

const DELAY_BEFORE_ENABLING = 30 * 1000;

export function createSigningRetryableGenerator(host: RetryableHost) {
  return async function withRetryableSigning<T>(fn: () => Promise<T>): Promise<T> {
    const signingRetryable = new Retryable(fn);
    const resultProm = signingRetryable.run();
    const finished = await withinTimeLimit(resultProm, DELAY_BEFORE_ENABLING);
    if (!finished) host.enableRetryableSigning(signingRetryable);
    const result = await resultProm;
    host.disableRetryableSigning();
    return result;
  };
}
