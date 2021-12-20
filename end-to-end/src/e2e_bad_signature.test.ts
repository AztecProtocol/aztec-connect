import { AssetId, createWalletSdk, WalletSdk, WalletSdkUser, EthAddress, WalletProvider, TxType } from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end bad signature tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let accounts: EthAddress[];
  let depositFee: bigint;
  const users: WalletSdkUser[] = [];
  const assetId = AssetId.ETH;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2);
    accounts = provider.getAccounts();

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      memoryDb: true,
      minConfirmation: 1,
      minConfirmationEHW: 1,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    for (let i = 0; i < accounts.length; i++) {
      const user = await sdk.addUser(provider.getPrivateKeyForAddress(accounts[i])!);
      users.push(user);
    }

    depositFee = await sdk.getFee(assetId, TxType.DEPOSIT);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  const deposit = async (amount = 100n) => {
    const userAsset = users[1].getAsset(assetId);
    const depositor = accounts[1];
    const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
    await sdk.depositFundsToContract(assetId, depositor, amount + depositFee);
    const proofOutput = await userAsset.createDepositProof(amount, depositFee, schnorrSigner, depositor);
    const signature = await sdk.signProof(proofOutput, depositor);
    return sdk.sendProof(proofOutput, signature);
  };

  it('should deposit with a bad signature but a proof approval', async () => {
    const sender = users[0];
    const user0Asset = sender.getAsset(assetId);
    const depositor = accounts[0];
    const amount = user0Asset.toBaseUnits('0.02');

    const txHash0 = await deposit();
    await sdk.awaitSettlement(txHash0);

    expect(user0Asset.balance()).toBe(0n);

    // 1. depositPending Funds
    await sdk.depositFundsToContract(assetId, depositor, amount + depositFee);

    // 2. create proof
    const schnorrSigner = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(depositor)!);
    const proofOutput = await user0Asset.createDepositProof(amount, depositFee, schnorrSigner, depositor);

    // 3. create invalid signature
    const signature = await sdk.signProof(proofOutput, accounts[2], provider);
    const validSignature = sdk.validateSignature(depositor, signature, proofOutput.tx.txHash.toBuffer());
    expect(validSignature).toBe(false);
    await expect(sdk.sendProof(proofOutput, signature)).rejects.toThrow();

    // 4. approve proof
    await sdk.approveProof(depositor, proofOutput.tx.txHash.toBuffer());

    // 5. send proof
    const txHash1 = await sdk.sendProof(proofOutput, signature);
    const txHash2 = await deposit();
    await Promise.all([sdk.awaitSettlement(txHash1), sdk.awaitSettlement(txHash2)]);

    expect(user0Asset.balance()).toBe(amount);
  });
});
