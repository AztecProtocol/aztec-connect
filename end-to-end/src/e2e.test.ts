import 'fake-indexeddb/auto';

import { createSdk, Sdk } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { Address } from 'web3x/address';
import { Eth } from 'web3x/eth';
import { WebsocketProvider } from 'web3x/providers';
import { ERC20Mintable } from './contracts/ERC20Mintable';

jest.setTimeout(120000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:80' } = process.env;

describe('end-to-end tests', () => {
  let provider: WebsocketProvider;
  let sdk: Sdk;
  let userA: Address;
  let userB: Address;
  let erc20: ERC20Mintable;

  beforeAll(async () => {
    // init sdk
    sdk = await createSdk(ROLLUP_HOST, { syncInstances: false, saveProvingKey: false, clearDb: true });
    await sdk.init();
    await sdk.awaitSynchronised();

    // get contract addresses
    const status = await sdk.getStatus();
    const rollupContractAddress = Address.fromString(status.rollupContractAddress);
    const tokenContractAddress = Address.fromString(status.tokenContractAddress);

    provider = new WebsocketProvider(ETHEREUM_HOST);
    const eth = new Eth(provider);
    erc20 = new ERC20Mintable(eth, tokenContractAddress, { gas: 5000000 });
    [userA, userB] = await eth.getAccounts();
    eth.defaultFromAddress = userA;

    // mint and approve funds
    await erc20.methods.mint(userA, 1000).send().getReceipt();
    await erc20.methods.approve(rollupContractAddress, 1000).send().getReceipt();
  });

  afterAll(async () => {
    await sdk.destroy();
    provider.disconnect();
  });

  it('should deposit funds', async () => {
    const initialTokenBalance = BigInt(await erc20.methods.balanceOf(userA).call());
    expect(initialTokenBalance).toBe(1000n);
    expect(sdk.getBalance(0)).toBe(0);

    const txHash = await sdk.deposit(1000, userA.toBuffer());
    await sdk.awaitSettlement(txHash);

    const finalTokenBalance = BigInt(await erc20.methods.balanceOf(userA).call());
    expect(finalTokenBalance).toBe(0n);
    expect(sdk.getBalance(0)).toBe(1000);
  });

  it('should transfer funds', async () => {
    const user2 = await sdk.createUser();

    expect(sdk.getBalance(0)).toBe(1000);
    expect(sdk.getBalance(1)).toBe(0);

    const transferTxHash = await sdk.transfer(1000, user2.publicKey);
    await sdk.awaitSettlement(transferTxHash);

    expect(sdk.getBalance(0)).toBe(0);
    expect(sdk.getBalance(1)).toBe(1000);
  });

  it('should withdraw funds', async () => {
    const initialTokenBalance = BigInt(await erc20.methods.balanceOf(userB).call());
    expect(initialTokenBalance).toBe(0n);
    expect(sdk.getBalance(1)).toBe(1000);

    sdk.switchToUser(1);
    const withdrawTxHash = await sdk.withdraw(1000, userB.toBuffer());
    await sdk.awaitSettlement(withdrawTxHash);

    const finalTokenBalance = BigInt(await erc20.methods.balanceOf(userB).call());
    expect(finalTokenBalance).toBe(1000n);
    expect(sdk.getBalance(1)).toBe(0);
  });
});
