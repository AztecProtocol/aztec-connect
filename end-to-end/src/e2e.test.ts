import 'fake-indexeddb/auto';

import { createSdk, Sdk, Signer } from 'aztec2-sdk';
import { EventEmitter } from 'events';
import { Address } from 'web3x/address';
import { Eth } from 'web3x/eth';
import { WebsocketProvider } from 'web3x/providers';
import { recoverFromSigString } from 'web3x/utils';
import { ERC20Mintable } from './contracts/ERC20Mintable';

jest.setTimeout(10 * 60 * 1000);
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
  let users: Address[];
  let signers: Signer[];
  let erc20: ERC20Mintable;
  let rollupContractAddress: Address;
  let tokenContractAddress: Address;
  const scalingFactor = 10000000000000000n;

  beforeAll(async () => {
    // Init sdk.
    sdk = await createSdk(ROLLUP_HOST, { syncInstances: false, saveProvingKey: false, clearDb: true });
    await sdk.init();
    await sdk.awaitSynchronised();

    // Get contract addresses.
    const status = await sdk.getStatus();
    rollupContractAddress = Address.fromString(status.rollupContractAddress);
    tokenContractAddress = Address.fromString(status.tokenContractAddress);

    // Get accounts and signers.
    provider = new WebsocketProvider(ETHEREUM_HOST);
    const eth = new Eth(provider);
    users = await eth.getAccounts();
    eth.defaultFromAddress = users[0];
    signers = users.map(u => new RemoteSigner(eth, u));

    erc20 = new ERC20Mintable(eth, tokenContractAddress, { gas: 5000000 });
  });

  afterAll(async () => {
    await sdk.destroy();
    provider.disconnect();
  });

  it('should sign data', async () => {
    const data = Buffer.alloc(100, 1);
    const signature = await signers[0].signMessage(data);
    const recoveredSigner = recoverFromSigString(`0x${data.toString('hex')}`, `0x${signature.toString('hex')}`);
    expect(recoveredSigner).toEqual(users[0]);
  });

  it('should deposit, transfer and withdraw funds', async () => {
    await erc20.methods
      .mint(users[0], (1000n * scalingFactor).toString())
      .send()
      .getReceipt();
    await erc20.methods
      .approve(rollupContractAddress, (1000n * scalingFactor).toString())
      .send()
      .getReceipt();

    // Deposit to user 0.
    const initialTokenBalance = BigInt(await erc20.methods.balanceOf(users[0]).call());
    expect(initialTokenBalance).toBe(1000n * scalingFactor);
    expect(sdk.getBalance(0)).toBe(0);

    const txHash = await sdk.deposit(1000, signers[0]);
    await sdk.awaitSettlement(txHash);

    const user0TokenBalance = BigInt(await erc20.methods.balanceOf(users[0]).call());
    expect(user0TokenBalance).toBe(0n);
    expect(sdk.getBalance(0)).toBe(1000);

    // Transfer to user 1.
    const user1 = await sdk.createUser();
    expect(sdk.getBalance(0)).toBe(1000);
    expect(sdk.getBalance(1)).toBe(0);

    const transferTxHash = await sdk.transfer(1000, user1.publicKey);
    await sdk.awaitSettlement(transferTxHash);

    expect(sdk.getBalance(0)).toBe(0);
    expect(sdk.getBalance(1)).toBe(1000);

    // Withdraw to user 1.
    sdk.switchToUser(1);
    const withdrawTxHash = await sdk.withdraw(1000, users[1].toBuffer());
    await sdk.awaitSettlement(withdrawTxHash);

    const user1TokenBalance = BigInt(await erc20.methods.balanceOf(users[1]).call());
    expect(user1TokenBalance).toBe(1000n * scalingFactor);
    expect(sdk.getBalance(1)).toBe(0);
  });

  it('should transfer public tokens', async () => {
    await erc20.methods
      .mint(users[2], (1000n * scalingFactor).toString())
      .send()
      .getReceipt();
    await erc20.methods
      .approve(rollupContractAddress, (1000n * scalingFactor).toString())
      .send({ from: users[2] })
      .getReceipt();

    const initialTokenBalance = BigInt(await erc20.methods.balanceOf(users[3]).call());
    expect(initialTokenBalance).toBe(0n);

    const publicTransferTxHash = await sdk.publicTransfer(1000, signers[2], users[3].toBuffer());
    await sdk.awaitSettlement(publicTransferTxHash);

    const finalTokenBalance = BigInt(await erc20.methods.balanceOf(users[3]).call());
    expect(finalTokenBalance).toBe(1000n * scalingFactor);
  });
});
