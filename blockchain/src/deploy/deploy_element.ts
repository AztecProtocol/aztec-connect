import ElementBridge from '../artifacts/contracts/bridges/ElementBridge.sol/ElementBridge.json';
import * as ElementVaultConfig from './ElementVaultConfig.json';
import { Contract, ContractFactory, Signer } from 'ethers';

const TRANCHE_BYTECODE_HASH = Buffer.from('f481a073666136ab1f5e93b296e84df58092065256d0db23b2d22b62c68e978d', 'hex');
export const ASSETS = ['usdc', 'dai', 'lusd3crv-f', 'stecrv', 'wbtc', 'alusd3crv-f', 'mim-3lp3crv-f'];

export interface ElementPoolSpec {
  asset: string;
  wrappedPosition: string;
  expiry: number;
  poolAddress: string;
}
export interface ElementPoolConfiguration {
  poolSpecs: ElementPoolSpec[];
  balancerAddress: string;
  trancheByteCodeHash: Buffer;
  trancheFactoryAddress: string;
}
const expiryCutOff = Date.parse('01 Jan 2022 00:00:00 GMT');

const parseTranches = () => {
  const config = ElementVaultConfig as any;
  const poolSpecs = ASSETS.flatMap(asset => {
    const assetTranches = config.tranches[asset];
    return assetTranches
      .filter((tranche: any) => tranche.expiration * 1000 > expiryCutOff)
      .map((tranche: any) => {
        return {
          asset,
          wrappedPosition: config.wrappedPositions.yearn[asset],
          expiry: tranche.expiration,
          poolAddress: tranche.ptPool.address,
        } as ElementPoolSpec;
      });
  });
  return {
    poolSpecs,
    balancerAddress: ElementVaultConfig.balancerVault,
    trancheByteCodeHash: TRANCHE_BYTECODE_HASH,
    trancheFactoryAddress: ElementVaultConfig.trancheFactory,
  } as ElementPoolConfiguration;
};
export const elementConfig = parseTranches();
export const elementAssets = ASSETS.map(asset => (ElementVaultConfig as any).tokens[asset]);

export const deployElementBridge = async (
  owner: Signer,
  rollupAddress: string,
  trancheFactoryAddress: string,
  trancheByteCode: Buffer,
  balancerAddress: string,
) => {
  console.error('Deploying ElementBridge...');
  const ElementFactory = new ContractFactory(ElementBridge.abi, ElementBridge.bytecode, owner);
  const bridge = await ElementFactory.deploy(rollupAddress, trancheFactoryAddress, trancheByteCode, balancerAddress);
  console.error(`ElementBridge contract address: ${bridge.address}`);
  return bridge;
};

export const setupElementPools = async (elementPoolConfig: ElementPoolConfiguration, bridgeContract: Contract) => {
  for (const spec of elementPoolConfig.poolSpecs) {
    const dateString = new Date(spec.expiry * 1000).toDateString();
    console.error(`Registering convergent pool ${spec.poolAddress} for ${spec.asset} and expiry ${dateString}...`);
    await bridgeContract.registerConvergentPoolAddress(spec.poolAddress, spec.wrappedPosition, spec.expiry);
  }
};
