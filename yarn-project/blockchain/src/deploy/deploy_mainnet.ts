import { EthAddress } from '@aztec/barretenberg/address';
import { TreeInitData } from '@aztec/barretenberg/environment';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils.js';
import {
  deployCurveBridge,
  deployDefiBridgeProxy,
  deployElementBridge,
  deployFeeDistributor,
  deployLidoBridge,
  deployRollupProcessor,
  deployVerifier,
  deployAztecFaucet,
  deployAceOfZk,
  deployMockDataProvider,
} from './deployers/index.js';
import { setEthBalance } from '../tenderly/index.js';

const gasLimit = 5000000;
const escapeBlockLower = 2160;
const escapeBlockUpper = 2400;
const balanceToSet = 10n ** 24n;

const MAIN_MULTI_SIG_ADDRESS = '0xE298a76986336686CC3566469e3520d23D1a8aaD';
const DEV_NET_TEMP_MULTI_SIG_ADDRESS = '0x7095057A08879e09DC1c0a85520e3160A0F67C96';
const EMERGENCY_MULTI_SIG_ADDRESS = '0x23f8008159C0427458b948c3DD7795c6DBE8236F';
const DAI_ADDRESS = '0x6b175474e89094c44da98b954eedeac495271d0f';
const LIDO_WSTETH_ADDRESS = '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0';
const UNISWAP_ROUTER_ADDRESS = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
const DAI_PRICE_FEED_ADDRESS = '0x773616E4d11A78F511299002da57A0a94577F1f4';
const FAST_GAS_PRICE_FEED_ADDRESS = '0x169e633a2d1e6c10dd91238ba11c4a708dfef37c';
const LIDO_REFERRAL_ADDRESS = '0xA57EC00BdbA2904DA1244Db6fd770e0874f22E42';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const EMERGENCY_ROLE = keccak256(toUtf8Bytes('EMERGENCY_ROLE'));
const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));
const LISTER_ROLE = keccak256(toUtf8Bytes('LISTER_ROLE'));

function notUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export async function deployMainnet(
  host: string,
  signer: Signer,
  { dataTreeSize, roots }: TreeInitData,
  vk: string,
  faucetOperator?: EthAddress,
  rollupProvider?: EthAddress,
) {
  const signerAddress = await signer.getAddress();
  const addressesToTopup = [EthAddress.fromString(signerAddress), faucetOperator, rollupProvider];
  await setEthBalance(addressesToTopup.filter(notUndefined), balanceToSet, host);
  const verifier = await deployVerifier(signer, vk);
  const defiProxy = await deployDefiBridgeProxy(signer);
  const { rollup, proxyAdmin, permitHelper } = await deployRollupProcessor(
    signer,
    verifier,
    defiProxy,
    signerAddress,
    escapeBlockLower,
    escapeBlockUpper,
    roots.dataRoot,
    roots.nullRoot,
    roots.rootsRoot,
    dataTreeSize,
    false,
    true,
  );
  const feeDistributor = await deployFeeDistributor(signer, rollup, UNISWAP_ROUTER_ADDRESS);

  await rollup.setRollupProvider(rollupProvider ? rollupProvider.toString() : signerAddress, true, {
    gasLimit,
  });

  await rollup.setSupportedAsset(DAI_ADDRESS, 55_000, { gasLimit });
  await permitHelper.preApprove(DAI_ADDRESS, { gasLimit });
  await rollup.setSupportedAsset(LIDO_WSTETH_ADDRESS, 55_000, { gasLimit });
  await permitHelper.preApprove(LIDO_WSTETH_ADDRESS, { gasLimit });

  const expiryCutOff = new Date('01 Sept 2022 00:00:00 GMT');
  const elementBridge = await deployElementBridge(signer, rollup, ['dai'], expiryCutOff);
  const lidoBridge = await deployLidoBridge(signer, rollup, LIDO_REFERRAL_ADDRESS);
  const zkBridge = await deployAceOfZk(signer, rollup);
  const curveBridge = await deployCurveBridge(signer, rollup);

  const bridgeDataProvider = await deployMockDataProvider(signer);
  await bridgeDataProvider.setBridgeData(1, elementBridge.address, 50000, 'Element Bridge');
  await bridgeDataProvider.setBridgeData(2, lidoBridge.address, 50000, 'Lido Bridge');
  await bridgeDataProvider.setBridgeData(3, zkBridge.address, 50000, 'Ace of ZK Bridge');
  await bridgeDataProvider.setBridgeData(4, curveBridge.address, 50000, 'Curve Bridge');

  const MULTI_SIG_ADDRESS = (await signer.getChainId()) == 1 ? MAIN_MULTI_SIG_ADDRESS : DEV_NET_TEMP_MULTI_SIG_ADDRESS;

  // Transfers ownership of the permitHelper to the multisig
  await permitHelper.transferOwnership(MULTI_SIG_ADDRESS, { gasLimit });

  // Transfers ownership of the proxyadmin to the multisig
  await proxyAdmin.transferProxyAdminOwnership(EthAddress.fromString(MULTI_SIG_ADDRESS));

  const priceFeeds = [FAST_GAS_PRICE_FEED_ADDRESS, DAI_PRICE_FEED_ADDRESS];

  // Grant roles to multisig wallets
  await rollup.grantRole(DEFAULT_ADMIN_ROLE, MULTI_SIG_ADDRESS, { gasLimit });
  await rollup.grantRole(OWNER_ROLE, MULTI_SIG_ADDRESS, { gasLimit });
  await rollup.grantRole(LISTER_ROLE, MULTI_SIG_ADDRESS, { gasLimit });
  await rollup.grantRole(EMERGENCY_ROLE, EMERGENCY_MULTI_SIG_ADDRESS, { gasLimit });

  // Revoke roles from the deployer
  await rollup.revokeRole(EMERGENCY_ROLE, await signer.getAddress(), { gasLimit });
  await rollup.revokeRole(OWNER_ROLE, await signer.getAddress(), { gasLimit });

  // TODO: Revoking of the default admin role should be done manually with the multi-sig to ensure correct setup

  const faucet = await deployAztecFaucet(signer, faucetOperator);

  return { rollup, priceFeeds, feeDistributor, permitHelper, faucet, bridgeDataProvider };
}
