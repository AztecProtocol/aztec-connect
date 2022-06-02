import { Contract, ContractFactory, Signer } from 'ethers';
import RollupProcessor from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import { ProxyAdmin } from '../../contracts/rollup_processor/proxy_admin';

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
) {
  console.error('Deploying RollupProcessor...');
  const rollupFactory = new ContractFactory(RollupProcessor.abi, RollupProcessor.bytecode, signer);

  const proxyAdmin = new ProxyAdmin(signer);
  await proxyAdmin.deployInstance();

  const rollup = await proxyAdmin.deployProxyAndInitializeWithConstructor(
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

  return { rollup, proxyAdmin };
}
