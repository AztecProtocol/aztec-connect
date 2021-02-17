import {
  AssetId,
  createEthSdk,
  EthAddress,
  EthereumSdk,
  EthereumSdkUser,
  EthereumSdkUserAsset,
  WalletProvider,
  TxType,
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';
import { topUpFeeDistributorContract } from './fee_distributor_contract';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end permit tests', () => {
  let provider: WalletProvider;
  let sdk: EthereumSdk;
  let user: EthereumSdkUser;
  let userAsset: EthereumSdkUserAsset;
  let userAddress: EthAddress;
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, '10');
    userAddress = provider.getAccount(0);

    sdk = await createEthSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    user = await sdk.addUser(userAddress);
    userAsset = await user.getAsset(assetId);

    const {
      blockchainStatus: { rollupContractAddress },
    } = await sdk.getRemoteStatus();
    const oneEth = sdk.toBaseUnits(AssetId.ETH, '1');
    await topUpFeeDistributorContract(oneEth, rollupContractAddress, provider, provider.getAccount(1));
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit funds to permit supporting asset', async () => {
    const depositValue = userAsset.toBaseUnits('1000');
    const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);
    await userAsset.mint(depositValue + txFee);
    expect(await userAsset.publicBalance()).toBe(depositValue + txFee);
    expect(userAsset.balance()).toBe(0n);

    const txHash = await userAsset.deposit(depositValue, txFee);
    await sdk.awaitSettlement(txHash, 300);

    expect(await userAsset.publicBalance()).toBe(0n);
    expect(userAsset.balance()).toBe(depositValue);
  });
});
