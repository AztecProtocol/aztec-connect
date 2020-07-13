import 'fake-indexeddb/auto';

import { createSdk, Sdk, Signer } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { Address } from 'web3x/address';
import { Eth } from 'web3x/eth';
import { WebsocketProvider } from 'web3x/providers';
import { recoverFromSigString } from 'web3x/utils';
import { ERC20Mintable } from './contracts/ERC20Mintable';

jest.setTimeout(120000);
EventEmitter.defaultMaxListeners = 30;

const { ETHEREUM_HOST = 'http://localhost:8545', ROLLUP_HOST = 'http://localhost:80' } = process.env;

class RemoteSigner implements Signer {
  constructor(private eth: Eth, private account: Address) {}

  public getAddress() {
    return this.account.toBuffer();
  }

  public async signMessage(data: Buffer) {
    const message = `0x${data.toString('hex')}`;
    const signatureStr = await this.eth.sign(this.account, message);
    let signature = Buffer.from(signatureStr.slice(2), 'hex');

    // Ganache is not signature standard compliant. Returns 00 or 01 as v.
    // Need to adjust to make v 27 or 28.
    const v = signature[signature.length - 1];
    if (v <= 1) {
      signature = Buffer.concat([signature.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signature;
  }
}

describe('end-to-end tests', () => {
  let provider: WebsocketProvider;
  let sdk: Sdk;
  let userA: Address;
  let userB: Address;
  let userASigner: Signer;
  let userBSigner: Signer;
  let erc20: ERC20Mintable;
  const scalingFactor = 10000000000000000n;

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

    userASigner = new RemoteSigner(eth, userA);
    userBSigner = new RemoteSigner(eth, userB);

    // mint and approve funds
    await erc20.methods
      .mint(userA, (1000n * scalingFactor).toString())
      .send()
      .getReceipt();
    await erc20.methods
      .approve(rollupContractAddress, (1000n * scalingFactor).toString())
      .send()
      .getReceipt();
  });

  afterAll(async () => {
    await sdk.destroy();
    provider.disconnect();
  });

  it('should sign data', async () => {
    const data = Buffer.alloc(100, 1);
    const signature = await userASigner.signMessage(data);
    const recoveredSigner = recoverFromSigString(`0x${data.toString('hex')}`, `0x${signature.toString('hex')}`);
    expect(recoveredSigner).toEqual(userA);
  });

  it('should deposit funds', async () => {
    const initialTokenBalance = BigInt(await erc20.methods.balanceOf(userA).call());
    expect(initialTokenBalance).toBe(1000n * scalingFactor);
    expect(sdk.getBalance(0)).toBe(0);

    const txHash = await sdk.deposit(1000, userASigner);
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
    const withdrawTxHash = await sdk.withdraw(1000, userBSigner);
    await sdk.awaitSettlement(withdrawTxHash);

    const finalTokenBalance = BigInt(await erc20.methods.balanceOf(userB).call());
    expect(finalTokenBalance).toBe(1000n * scalingFactor);
    expect(sdk.getBalance(1)).toBe(0);
  });
});
