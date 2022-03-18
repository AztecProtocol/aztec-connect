import * as RollupAbi from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import * as ElementAbi from '../artifacts/contracts/bridges/ElementBridge.sol/ElementBridge.json';

export const abis: { [key: string]: any } = {
  Rollup: RollupAbi,
  Element: ElementAbi,
};