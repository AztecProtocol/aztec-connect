import { Provider } from '@ethersproject/providers';
import { listenPoll, Obs } from 'app/util';

const GAS_PRICE_POLL_INTERVAL = 1000 * 60;

export function createGasPriceObs(provider: Provider) {
  return Obs.emitter<bigint | undefined>(
    emit =>
      listenPoll(async () => {
        const bigNumber = await provider.getGasPrice();
        emit(BigInt(bigNumber.toString()));
      }, GAS_PRICE_POLL_INTERVAL),
    undefined,
  );
}

export type GasPriceObs = ReturnType<typeof createGasPriceObs>;
