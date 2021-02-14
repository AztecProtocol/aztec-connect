import { Wallet } from 'ethers';
import { WalletSdk, WalletProvider, SchnorrSigner, AccountId, AssetId, EthAddress } from '@aztec/sdk';
import { TxHash } from 'barretenberg/tx_hash';
import { utils } from 'ethers';

export default class Agent {
  private wallet: Wallet;
  private address: EthAddress;
  private pendingTxHash?: TxHash;
  private signer!: SchnorrSigner;
  private aztecUserId!: AccountId;
  private step: number;
  private steps: string[];

  constructor(
    private sdk: WalletSdk,
    provider: WalletProvider,
    private id: number,
    private minBalance: bigint,
    private masterWallet: Wallet,
  ) {
    this.sdk = sdk;
    this.wallet = Wallet.createRandom();
    this.address = provider.addEthersWallet(this.wallet);

    this.steps = ['init', 'deposit', ...Array(1).fill('transfer'), 'withdraw'];
    this.step = 0;
  }

  async init() {
    if (this.aztecUserId) {
      return;
    }

    const privateKey = await this.deriveAztecPrivateKey();
    const user = await this.sdk.addUser(privateKey);
    const { id, publicKey, nonce } = user.getUserData();
    console.log(`Agent ${this.id} synching...`);
    await this.sdk.awaitUserSynchronised(id);

    this.aztecUserId = id;
    this.signer = this.sdk.createSchnorrSigner(privateKey);

    if (!nonce) {
      this.aztecUserId = new AccountId(publicKey, 1);
      const alias = this.address.toString();
      console.log(`Agent ${this.id} creating account...`);
      return await this.sdk.createAccount(id, alias, publicKey);
    }
  }

  private async deriveAztecPrivateKey() {
    const signature = await this.wallet.signMessage('Deterministic account message');
    const hash = utils.keccak256(signature);
    return Buffer.from(hash.slice(2), 'hex').slice(0, 32);
  }

  private async fundWallet() {
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);

    if (balance >= this.minBalance) {
      return;
    }

    const value = this.minBalance - balance;
    console.log(`Agent ${this.id} funding...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    await this.masterWallet.provider.waitForTransaction(hash);
  }

  private async deposit() {
    await this.fundWallet();

    console.log(`Agent ${this.id} depositing...`);
    const value = this.sdk.toBaseUnits(AssetId.ETH, '0.01');
    const fee = await this.sdk.getFee(AssetId.ETH);
    return await this.sdk.deposit(AssetId.ETH, this.address, this.aztecUserId, value, fee, this.signer);
  }

  private async transfer() {
    console.log(`Agent ${this.id} transferring...`);
    const value = this.sdk.toBaseUnits(AssetId.ETH, '0.01');
    const fee = await this.sdk.getFee(AssetId.ETH);
    return await this.sdk.transfer(AssetId.ETH, this.aztecUserId, value, fee, this.signer, this.aztecUserId);
  }

  private async withdraw() {
    console.log(`Agent ${this.id} withdrawing...`);
    const masterAddress = EthAddress.fromString(this.masterWallet.address);
    const value = this.sdk.toBaseUnits(AssetId.ETH, '0.01');
    const fee = await this.sdk.getFee(AssetId.ETH);
    return await this.sdk.withdraw(AssetId.ETH, this.aztecUserId!, value, fee, this.signer, masterAddress);
  }

  public async advanceAgent() {
    if (this.pendingTxHash) {
      try {
        await this.sdk.awaitSettlement(this.pendingTxHash, 1);
        this.pendingTxHash = undefined;
      } catch (err) {
        return;
      }
    }

    try {
      this.pendingTxHash = await this.nextStep();
      this.step++;
    } catch (err) {
      console.log(err);
    }
  }

  private async nextStep() {
    switch (this.steps[this.step % this.steps.length]) {
      case 'init':
        return await this.init();
      case 'deposit':
        return await this.deposit();
      case 'transfer':
        return await this.transfer();
      case 'withdraw':
        return await this.withdraw();
    }
  }
}
