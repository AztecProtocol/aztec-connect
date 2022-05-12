import { LidoBridgeData } from '@aztec/bridge-clients/client-dest/src/client/lido/lido-bridge-data';
import { BridgeDataAdaptorCreator } from './types';
import { EthAddress } from '@aztec/sdk';

export const createLidoAdaptor: BridgeDataAdaptorCreator = provider => {
  const curvePoolAddress = EthAddress.fromString('0xdc24316b9ae028f1497c275eb9192a3ea0f67022');
  const wstETHAddress = EthAddress.fromString('0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0');
  const lidoOracleAddress = EthAddress.fromString('0x442af784A788A5bd6F42A01Ebe9F287a871243fb');

  return LidoBridgeData.create(provider, wstETHAddress as any, lidoOracleAddress as any, curvePoolAddress as any);
};
