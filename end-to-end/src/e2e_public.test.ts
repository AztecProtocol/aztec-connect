import 'fake-indexeddb/auto';

import { AssetId, EthereumSdk, EthereumSdkUser } from 'aztec2-sdk';
import { EthAddress } from 'barretenberg/address';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { Eth } from 'web3x/eth';
import { HttpProvider } from 'web3x/providers';

jest.setTimeout(10 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:8081' } = process.env;

describe('end-to-end tests', () => {
  let provider: HttpProvider;
  let sdk: EthereumSdk;
  let userAddresses: EthAddress[];
  let users: EthereumSdkUser[];
  const assetId = AssetId.DAI;

  beforeAll(async () => {
    // Init sdk.
    provider = new HttpProvider(ETHEREUM_HOST);
    sdk = new EthereumSdk((provider as any).provider);
    await sdk.init(ROLLUP_HOST, {
      syncInstances: false,
      saveProvingKey: false,
      clearDb: true,
    });
    await sdk.awaitSynchronised();

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

  it('should transfer public tokens', async () => {
    const user2Asset = users[2].getAsset(assetId);
    const user3Asset = users[3].getAsset(assetId);

    const transferValue = user2Asset.toErc20Units('1000');

    await user2Asset.mint(transferValue);
    await user2Asset.approve(transferValue);

    expect(await user2Asset.publicBalance()).toBe(transferValue);
    expect(await user3Asset.publicBalance()).toBe(0n);

    const publicTransferTxHash = await user2Asset.publicTransfer(transferValue, userAddresses[3]);
    await sdk.awaitSettlement(userAddresses[2], publicTransferTxHash, 300);

    expect(await user2Asset.publicBalance()).toBe(0n);
    expect(await user3Asset.publicBalance()).toBe(transferValue);
  });
});
