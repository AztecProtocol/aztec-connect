import * as RollupAbi from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import * as ElementFactory from '@aztec/bridge-clients/client-dest/typechain-types/factories/ElementBridge__factory';

export const abis: { [key: string]: any } = {
  Rollup: RollupAbi,
  Element: ElementFactory.ElementBridge__factory.abi,
};
