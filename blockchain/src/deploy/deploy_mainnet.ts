import { EthAddress } from '@aztec/barretenberg/address';
import { TreeInitData } from '@aztec/barretenberg/environment';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { RollupProcessor } from '../contracts';
import { EthersAdapter } from '../provider';
import {
  deployDefiBridgeProxy,
  deployElementBridge,
  deployFeeDistributor,
  deployLidoBridge,
  deployMockVerifier,
  deployRollupProcessor,
  deployVerifier,
} from './deployers';

const gasLimit = 5000000;
const escapeBlockLower = 2160;
const escapeBlockUpper = 2400;

const MULTI_SIG_ADDRESS = '0xE298a76986336686CC3566469e3520d23D1a8aaD';
const EMERGENCY_MULTI_SIG_ADDRESS = '0x23f8008159C0427458b948c3DD7795c6DBE8236F';
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const LIDO_WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const DAI_PRICE_FEED_ADDRESS = '0x773616E4d11A78F511299002da57A0a94577F1f4';
const FAST_GAS_PRICE_FEED_ADDRESS = '0x169e633a2d1e6c10dd91238ba11c4a708dfef37c';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const EMERGENCY_ROLE = keccak256(toUtf8Bytes('EMERGENCY_ROLE'));
const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));

export async function deployMainnet(signer: Signer, { dataTreeSize, roots }: TreeInitData, vk?: string) {
  const verifier = vk ? await deployVerifier(signer, vk) : await deployMockVerifier(signer);
  const defiProxy = await deployDefiBridgeProxy(signer);
  const { rollup, proxyAdmin } = await deployRollupProcessor(
    signer,
    verifier,
    defiProxy,
    await signer.getAddress(),
    escapeBlockLower,
    escapeBlockUpper,
    roots.dataRoot,
    roots.nullRoot,
    roots.rootsRoot,
    dataTreeSize,
    false,
  );
  const feeDistributor = await deployFeeDistributor(signer, rollup, UNISWAP_ROUTER_ADDRESS);

  await rollup.setRollupProvider(await signer.getAddress(), true, { gasLimit });

  await rollup.setSupportedAsset(DAI_ADDRESS, 0, { gasLimit });
  await rollup.setSupportedAsset(LIDO_WSTETH_ADDRESS, 0, { gasLimit });

  const expiryCutOff = new Date('01 Sept 2022 00:00:00 GMT');
  await deployElementBridge(signer, rollup, ['dai'], expiryCutOff);
  await deployLidoBridge(signer, rollup);

  // Transfers ownership of the proxyadmin to the multisig
  await proxyAdmin.transferProxyAdminOwnership(EthAddress.fromString(MULTI_SIG_ADDRESS));

  const priceFeeds = [FAST_GAS_PRICE_FEED_ADDRESS, DAI_PRICE_FEED_ADDRESS];

  const rollupProcessor = new RollupProcessor(EthAddress.fromString(rollup.address), new EthersAdapter(signer));
  // Grant roles to multisig wallets
  await rollupProcessor.grantRole(DEFAULT_ADMIN_ROLE, EthAddress.fromString(MULTI_SIG_ADDRESS));
  await rollupProcessor.grantRole(OWNER_ROLE, EthAddress.fromString(MULTI_SIG_ADDRESS));
  await rollupProcessor.grantRole(EMERGENCY_MULTI_SIG_ADDRESS, EthAddress.fromString(EMERGENCY_MULTI_SIG_ADDRESS));

  // Revoke roles from the deployer
  await rollupProcessor.revokeRole(EMERGENCY_ROLE, EthAddress.fromString(await signer.getAddress()));
  await rollupProcessor.revokeRole(OWNER_ROLE, EthAddress.fromString(await signer.getAddress()));
  // TODO: Revoking of the default admin role should be done manually with the multi-sig to ensure correct setup

  return { rollup, priceFeeds, feeDistributor };
}
