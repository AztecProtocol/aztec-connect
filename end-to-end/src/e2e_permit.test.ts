import {
  AssetId,
  EthAddress,
  createWalletSdk,
  WalletSdk,
  WalletSdkUserAsset,
  UserData,
  createPermitData,
  EthersAdapter,
  WalletProvider,
  Web3Signer,
} from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { JsonRpcProvider } from '@ethersproject/providers';
import { randomBytes } from 'crypto';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end permit tests', () => {
  let provider: WalletProvider;
  let sdk: WalletSdk;
  let privateKey: Buffer;
  let user: UserData;
  let userAsset: WalletSdkUserAsset;
  let userAddress: EthAddress;
  const newPermitAssetId = AssetId.DAI + 1;

  beforeAll(async () => {
    provider = new WalletProvider(new EthersAdapter(new JsonRpcProvider(ETHEREUM_HOST)));

    privateKey = randomBytes(32);
    userAddress = provider.addAccount(privateKey);

    sdk = await createWalletSdk(provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    user = await sdk.addUser(privateKey);
    userAsset = await sdk.getUser(user.id).getAsset(newPermitAssetId);
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit funds to permit supporting asset', async () => {
    const depositValue = userAsset.toErc20Units('1000');
    await userAsset.mint(depositValue, userAddress);

    expect(await userAsset.publicBalance(userAddress)).toBe(depositValue);
    expect(userAsset.balance()).toBe(0n);

    const { rollupContractAddress } = sdk.getLocalStatus();
    const nonce = await sdk.getUserNonce(newPermitAssetId, userAddress);
    const tokenContract = await sdk.getTokenContract(newPermitAssetId);
    const tokenAddress = await tokenContract.getAddress();
    const tokenName = await tokenContract.name();
    const deadline = BigInt('0xffffffff');
    const chainId = 1; // Note: Ganache's chainId is actually 1337, but the chainid opcode returns 1.

    const dataToSign = createPermitData(
      tokenName,
      userAddress,
      rollupContractAddress,
      depositValue,
      nonce,
      deadline,
      chainId,
      tokenAddress,
    );
    const ethSigner = new Web3Signer(provider, userAddress);
    const signature = await ethSigner.signTypedData(dataToSign);
    const aztecSigner = sdk.createSchnorrSigner(privateKey);
    const permitArgs = { deadline, approvalAmount: depositValue, signature };

    const txHash = await userAsset.deposit(depositValue, aztecSigner, ethSigner, permitArgs);
    await sdk.awaitSettlement(user.id, txHash, 300);

    expect(await userAsset.publicBalance(userAddress)).toBe(0n);
    expect(userAsset.balance()).toBe(depositValue);
  });
});
