import {
  AssetId,
  createWalletSdk,
  EthAddress,
  TxType,
  WalletProvider,
  WalletSdk,
  WalletSdkUser,
  WalletSdkUserAsset,
} from '@aztec/sdk';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end permit tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let user: WalletSdkUser;
  let userAsset: WalletSdkUserAsset;
  let userAddress: EthAddress;
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 1);
    userAddress = provider.getAccount(0);

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

    user = await sdk.addUser(provider.getPrivateKeyForAddress(userAddress)!);
    userAsset = await user.getAsset(assetId);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit funds to permit supporting asset', async () => {
    const depositValue = userAsset.toBaseUnits('1000');
    const fee = await userAsset.getFee(TxType.DEPOSIT);
    const totalInput = depositValue + fee;

    await userAsset.mint(totalInput, userAddress);

    expect(await userAsset.publicBalance(userAddress)).toBe(totalInput);
    expect(await userAsset.publicAllowance(userAddress)).toBe(0n);
    expect(userAsset.balance()).toBe(0n);

    const permitArgs = await sdk.createPermitArgs(assetId, userAddress, totalInput);
    await userAsset.depositFundsToContract(userAddress, totalInput, permitArgs);

    expect(await userAsset.publicBalance(userAddress)).toBe(0n);
    expect(await userAsset.publicAllowance(userAddress)).toBe(0n);
    expect(userAsset.balance()).toBe(0n);

    const signer = sdk.createSchnorrSigner(provider.getPrivateKeyForAddress(userAddress)!);
    const proofOutput = await userAsset.createDepositProof(depositValue, fee, signer, userAddress);
    const signature = await sdk.signProof(proofOutput, userAddress);
    const txHash = await sdk.sendProof(proofOutput, signature);
    await sdk.awaitSettlement(txHash);

    expect(await userAsset.publicBalance(userAddress)).toBe(0n);
    expect(await userAsset.publicAllowance(userAddress)).toBe(0n);
    expect(userAsset.balance()).toBe(depositValue);
  });
});
