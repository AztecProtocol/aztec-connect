import { Contract, ContractFactory, Signer } from 'ethers';
import RollupProcessor from '../../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';

const gasLimit = 5000000;

export async function deployRollupProcessor(
  signer: Signer,
  verifier: Contract,
  defiProxy: Contract,
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
  const rollup = await rollupFactory.deploy();
  const address = await signer.getAddress();

  await rollup.initialize(
    verifier.address,
    escapeHatchBlockLower,
    escapeHatchBlockUpper,
    defiProxy.address,
    address,
    initDataRoot,
    initNullRoot,
    initRootsRoot,
    initDataSize,
    allowThirdPartyContracts,
    { gasLimit },
  );

  await rollup.setRollupProvider(address, true, { gasLimit });

  console.error(`RollupProcessor contract address: ${rollup.address}`);

  return rollup;
}
