import {
  AssetId,
  createWalletSdk,
  EthAddress,
  JsonRpcProvider,
  SchnorrSigner,
  TxType,
  WalletProvider,
  WalletSdk,
  WalletSdkUser,
} from '@aztec/sdk';
import { EventEmitter } from 'events';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:10545',
  SRIRACHA_HOST = 'https://api.aztec.network/sriracha',
  PRIVATE_KEY,
} = process.env;

/**
 * Set PRIVATE_KEY environment variable to an address key with > 0.1 goerli ETH. No 0x prefix.
 */
describe('testnet escape test', () => {
  let sdk: WalletSdk;
  let user!: WalletSdkUser;
  let userAddress: EthAddress;
  let signer!: SchnorrSigner;
  const assetId = AssetId.ETH;

  if (!PRIVATE_KEY) {
    throw new Error('Specify PRIVATE_KEY.');
  }

  beforeAll(async () => {
    const ethereumProvider = new JsonRpcProvider(ETHEREUM_HOST);
    const walletProvider = new WalletProvider(ethereumProvider);
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex');
    userAddress = walletProvider.addAccount(privateKey);

    sdk = await createWalletSdk(walletProvider, SRIRACHA_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    user = await sdk.addUser(privateKey);
    signer = sdk.createSchnorrSigner(privateKey);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit', async () => {
    const user0Asset = user.getAsset(assetId);
    const depositValue = user0Asset.toBaseUnits('0.1');
    const fee = await user0Asset.getFee(TxType.DEPOSIT);

    const initialPublicBalance = await sdk.getPublicBalance(assetId, userAddress);
    const initialBalance = user0Asset.balance();

    await sdk.depositFundsToContract(assetId, userAddress, depositValue + fee);

    const proofOutput = await user0Asset.createDepositProof(depositValue, fee, signer, userAddress);
    const txHash = await sdk.sendProof(proofOutput);
    await sdk.awaitSettlement(txHash);

    const publicBalance = await sdk.getPublicBalance(assetId, userAddress);
    const expectedPublicBalance = initialPublicBalance - depositValue - fee;
    expect(publicBalance < expectedPublicBalance).toBe(true);
    expect(user0Asset.balance()).toBe(initialBalance + depositValue);
  });
});
