import {
  AssetId,
  EthAddress,
  createWalletSdk,
  WalletSdk,
  deriveGrumpkinPrivateKey,
  WalletSdkUserAsset,
  UserData,
  createPermitData,
  EthersEthereumSigner,
} from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { HttpProvider } from 'web3x/providers';
import { Wallet } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end permit tests', () => {
  // MNEMONIC = test test test test test test test test test test test junk
  const ethPrivateKey = Buffer.from(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'.slice(2),
    'hex',
  );
  let sdk: WalletSdk;
  let userAddress: EthAddress;
  let userAsset: WalletSdkUserAsset;
  let grumpkinPrivateKey: Buffer;
  let userAccount: UserData;
  let localAccount: Wallet;
  let ethersSigner: EthersEthereumSigner;
  const newPermitAssetId = AssetId.DAI + 1;

  beforeAll(async () => {
    const provider = new HttpProvider(ETHEREUM_HOST);

    sdk = await createWalletSdk((provider as any).provider, ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
      dbPath: ':memory:',
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    localAccount = new Wallet(ethPrivateKey, new Web3Provider((provider as any).provider));
    ethersSigner = new EthersEthereumSigner(localAccount);
    userAddress = EthAddress.fromString(localAccount.address);
    grumpkinPrivateKey = await deriveGrumpkinPrivateKey(ethersSigner);
    userAccount = await sdk.addUser(grumpkinPrivateKey);
    userAsset = await sdk.getUser(userAccount.id).getAsset(newPermitAssetId);
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
    const chainId = 1; // Note: Ganache's chainId is actually 1337, but the chainid opcode returns 1

    const dataToSign = createPermitData(
      tokenName,
      EthAddress.fromString(localAccount.address),
      rollupContractAddress,
      depositValue,
      nonce,
      deadline,
      chainId,
      tokenAddress,
    );
    const signature = await ethersSigner.signTypedData(dataToSign);
    const aztecSigner = sdk.createSchnorrSigner(grumpkinPrivateKey);
    const permitArgs = { deadline, approvalAmount: depositValue, signature };
    const txHash = await userAsset.deposit(depositValue, aztecSigner, ethersSigner, permitArgs);
    await sdk.awaitSettlement(userAccount.id, txHash, 300);
    expect(await userAsset.publicBalance(userAddress)).toBe(0n);
    const user0BalanceAfterDeposit = userAsset.balance();
    expect(user0BalanceAfterDeposit).toBe(depositValue);
  });
});
