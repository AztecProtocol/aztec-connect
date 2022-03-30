import {
  ICurvePool__factory,
  IWstETH__factory,
  ILidoOracle__factory,
} from '@aztec/bridge-clients/client-dest/typechain-types';
import { LidoBridgeData } from '@aztec/bridge-clients/client-dest/src/client/lido/lido-bridge-data';
import { BridgeDataAdaptorCreator } from './types';
import { YieldBridgeData } from '@aztec/bridge-clients/client-dest/src/client/bridge-data';

export const createLidoAdaptor: BridgeDataAdaptorCreator = provider => {
  const curvePoolAddress = '0xdc24316b9ae028f1497c275eb9192a3ea0f67022';
  const wstETHAddress = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';
  const lidoOracleAddress = '0x442af784A788A5bd6F42A01Ebe9F287a871243fb';

  const curvePoolContract = ICurvePool__factory.connect(curvePoolAddress, provider);
  const wstETHContract = IWstETH__factory.connect(wstETHAddress, provider);
  const lidoOracleContract = ILidoOracle__factory.connect(lidoOracleAddress, provider);
  const adaptor: YieldBridgeData = new LidoBridgeData(wstETHContract, lidoOracleContract, curvePoolContract);
  return {
    isAsync: false,
    isYield: true,
    adaptor,
  };
};
