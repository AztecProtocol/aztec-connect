import { Provider } from '@ethersproject/providers';
import { Obs } from 'app/util';
import { Poller } from 'app/util/poller';

const GAS_PRICE_POLL_INTERVAL = 1000 * 60;

export function createGasPricePoller(provider: Provider) {
  const pollObs = Obs.constant(async () => {
    const bigNumber = await provider.getGasPrice();
    return BigInt(bigNumber.toString());
  });
  return new Poller(pollObs, GAS_PRICE_POLL_INTERVAL);
}

export type GasPricePoller = ReturnType<typeof createGasPricePoller>;
