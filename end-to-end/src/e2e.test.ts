import 'fake-indexeddb/auto';

import { AssetId, createSdk, Sdk, SdkUser } from 'aztec2-sdk';
import { EthAddress } from 'barretenberg/address';
import { EventEmitter } from 'events';
import { Eth } from 'web3x/eth';
import { HttpProvider } from 'web3x/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:80' } = process.env;

describe('end-to-end tests', () => {
  let provider: HttpProvider;
  let sdk: Sdk;
  let userAddresses: EthAddress[];
  let users: SdkUser[];
  let rollupContractAddress: EthAddress;
  let tokenContractAddress: EthAddress;
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    // Init sdk.
    provider = new HttpProvider(ETHEREUM_HOST);
    sdk = await createSdk(ROLLUP_HOST, (provider as any).provider, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
    });
    await sdk.init();
    await sdk.awaitSynchronised();

    // Get contract addresses.
    const status = await sdk.getRemoteStatus();
    rollupContractAddress = EthAddress.fromString(status.rollupContractAddress.toString());
    tokenContractAddress = EthAddress.fromString(status.tokenContractAddress.toString());

    // Get accounts and signers.
    const eth = new Eth(provider);
    userAddresses = (await eth.getAccounts()).slice(0, 4).map(a => new EthAddress(a.toBuffer()));
    users = await Promise.all(
      userAddresses.map(async address => {
        return sdk.addUser(address);
      }),
    );
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('should deposit, transfer and withdraw funds', async () => {
    const user0Asset = users[0].getAsset(assetId);
    const user1Asset = users[1].getAsset(assetId);

    await user0Asset.mint(1000n);
    await user0Asset.approve(1000n);

    // Deposit to user 0.
    const initialTokenBalance = await user0Asset.publicBalance();
    expect(initialTokenBalance).toBe(1000n);
    expect(await user0Asset.publicAllowance()).toBe(1000n);
    expect(user0Asset.balance()).toBe(0n);

    const txHash = await user0Asset.deposit(1000n);
    await sdk.awaitSettlement(userAddresses[0], txHash);

    const user0TokenBalance = await user0Asset.publicBalance();
    expect(user0TokenBalance).toBe(0n);
    expect(user0Asset.balance()).toBe(1000n);

    // Transfer to user 1.
    expect(user1Asset.balance()).toBe(0n);

    const transferTxHash = await user0Asset.transfer(800n, users[1].getUserData().publicKey);
    await sdk.awaitSettlement(userAddresses[0], transferTxHash);
    await sdk.awaitSettlement(userAddresses[1], transferTxHash);

    expect(user0Asset.balance()).toBe(200n);
    expect(user1Asset.balance()).toBe(800n);

    // Withdraw to user 1.
    const withdrawTxHash = await user1Asset.withdraw(300n);
    await sdk.awaitSettlement(users[1].getUserData().ethAddress, withdrawTxHash);

    const user1TokenBalance = await user1Asset.publicBalance();
    expect(user1TokenBalance).toBe(300n);
    expect(user1Asset.balance()).toBe(500n);
  });

  it('should transfer public tokens', async () => {
    const user2Asset = users[2].getAsset(assetId);
    const user3Asset = users[3].getAsset(assetId);

    await user2Asset.mint(1000n);
    await user2Asset.approve(1000n);

    const initialTokenBalance = await user3Asset.publicBalance();
    expect(initialTokenBalance).toBe(0n);

    const publicTransferTxHash = await user2Asset.publicTransfer(1000n, userAddresses[3]);
    await sdk.awaitSettlement(userAddresses[2], publicTransferTxHash);

    const finalTokenBalance = await user3Asset.publicBalance();
    expect(finalTokenBalance).toBe(1000n);
  });
});
