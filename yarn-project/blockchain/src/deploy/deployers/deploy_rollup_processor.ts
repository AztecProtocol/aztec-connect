import { Contract, ContractFactory, Signer } from 'ethers';
import { RollupProcessorJson, RollupProcessorV2Json } from '../../abis.js';
import { ProxyAdmin } from '../../contracts/rollup_processor/proxy_admin.js';
import { EthAddress } from '@aztec/barretenberg/address';
import { deployPermitHelper } from './deploy_permit_helper.js';

export async function deployRollupProcessor(
  signer: Signer,
  verifier: Contract,
  defiProxy: Contract,
  contractOwner: string,
  escapeHatchBlockLower: number,
  escapeHatchBlockUpper: number,
  initDataRoot: Buffer,
  initNullRoot: Buffer,
  initRootsRoot: Buffer,
  initDataSize: number,
  allowThirdPartyContracts: boolean,
  useLatest: boolean,
) {
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessorJson.abi, RollupProcessorJson.bytecode, signer);

  const proxyAdmin = new ProxyAdmin(signer);
  await proxyAdmin.deployInstance();

  let rollup = await proxyAdmin.deployProxyAndInitializeWithConstructor(
    rollupFactory,
    [
      verifier.address,
      defiProxy.address,
      contractOwner,
      initDataRoot,
      initNullRoot,
      initRootsRoot,
      initDataSize,
      allowThirdPartyContracts,
    ],
    [escapeHatchBlockLower, escapeHatchBlockUpper],
  );

  console.error(`RollupProcessor contract address: ${rollup.address}`);
  console.error(`Proxy admin contract address    : ${proxyAdmin.address}`);
  console.error(`Proxy Deployer contract address : ${proxyAdmin.proxyDeployer.address}`);

  // Upgrade to the newest version
  if (useLatest) {
    const rollupV2Factory = new ContractFactory(RollupProcessorV2Json.abi, RollupProcessorV2Json.bytecode, signer);
    rollup = await proxyAdmin.upgradeAndInitializeWithConstructor(
      EthAddress.fromString(rollup.address),
      rollupV2Factory,
      [],
      [escapeHatchBlockLower, escapeHatchBlockUpper],
    );
  }

  const permitHelper = await deployPermitHelper(signer, EthAddress.fromString(rollup.address));

  return { rollup, proxyAdmin, permitHelper };
}
