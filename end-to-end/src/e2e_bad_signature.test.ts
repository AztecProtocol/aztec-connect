import {
  AssetId,
  createWalletSdk,
  WalletSdk,
  WalletSdkUser,
  EthAddress,
  WalletProvider,
  TxType,
  EthereumSigner,
} from '@aztec/sdk';
import { Wallet } from 'ethers';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end wallet tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[] = [];
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 3, '3');
    accounts = provider.getAccounts();

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      users.push(user);
    }
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const normalDeposit = async (amount = 100n, txFee = 0n) => {
    const userAsset = users[1].getAsset(assetId);
    const depositor = accounts[1];
    const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
    await sdk.depositFundsToContract(assetId, depositor, amount + txFee);
    return await userAsset.deposit(amount, txFee, schnorrSigner, depositor);
  };

  it('should deposit with a bad signature but a proof approval', async () => {
    const sender = users[0];
    const user0Asset = sender.getAsset(assetId);
    const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);
    const depositor = accounts[0];
    const amount = user0Asset.toBaseUnits('0.02');

    const txHash0 = await normalDeposit();
    await sdk.awaitSettlement(txHash0);

    expect(user0Asset.balance()).toBe(0n);

    // 1. depositPending Funds
    await sdk.depositFundsToContract(assetId, depositor, amount + txFee);

    // 2. create proof
    const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
    const proofOutput = await sdk.createJoinSplitProof(
      assetId,
      sender.id,
      amount + txFee,
      0n,
      0n,
      0n,
      amount,
      schnorrSigner,
      sender.id,
      depositor,
    );

    // 3. create invalid signature
    const privateKey = provider.getPrivateKey(2);
    const wallet = new Wallet(privateKey);
    await proofOutput.ethSign((wallet as unknown) as EthereumSigner, EthAddress.fromString(wallet.address));
    const validSignature = (sdk as any).blockchain.validateSignature(
      depositor,
      (proofOutput as any).signature.slice(2),
      proofOutput.signingData,
    );
    expect(validSignature).toBe(false);

    // 4. approve proof
    await sdk.approveProof(depositor, proofOutput.signingData!);

    // 5. send proof
    const txHash1 = await sdk.sendProof(proofOutput);
    const txHash2 = await normalDeposit();
    await Promise.all([sdk.awaitSettlement(txHash1, 600), sdk.awaitSettlement(txHash2, 600)]);

    expect(user0Asset.balance()).toBe(amount);
  });
});
