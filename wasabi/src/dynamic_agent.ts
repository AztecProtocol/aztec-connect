import { AccountId, AztecSdk, EthAddress, SchnorrSigner, TxHash, TxId, WalletProvider } from '@aztec/sdk';
import { utils, Wallet } from 'ethers';

export class Agent {
  private wallet: Wallet;
  private address: EthAddress;
  private signer!: SchnorrSigner;
  private aztecUserId!: AccountId;
  private step: number;
  private steps: string[];
  private aztecTxId?: TxId;
  private ethTxHash?: TxHash;

  constructor(
    private sdk: AztecSdk,
    provider: WalletProvider,
    private id: number,
    private masterWallet: Wallet,
    numTransfers: number,
    private assetId = 0,
  ) {
    this.sdk = sdk;
    this.wallet = Wallet.createRandom();
    this.address = provider.addEthersWallet(this.wallet);

    this.steps = ['fund', 'depositToContract', 'deposit', ...Array(numTransfers).fill('transfer'), 'withdraw'];
    this.step = 0;
  }

  async init(): Promise<undefined> {
    if (this.aztecUserId) {
      return;
    }

    const privateKey = await this.deriveAztecPrivateKey();
    const user = await this.sdk.addUser(privateKey, undefined, true);
    const { id } = user.getUserData();

    this.aztecUserId = id;
    this.signer = this.sdk.createSchnorrSigner(privateKey);
  }

  private async deriveAztecPrivateKey() {
    const signature = await this.wallet.signMessage('Deterministic account message');
    const hash = utils.keccak256(signature);
    return Buffer.from(hash.slice(2), 'hex').slice(0, 32);
  }

  private async canProceed() {
    if (this.ethTxHash) {
      const receipt = await this.masterWallet.provider.getTransactionReceipt(this.ethTxHash.toString());
      if (receipt.confirmations > 0) {
        this.ethTxHash = undefined;
        return true;
      }
    }

    if (this.aztecTxId) {
      try {
        await this.sdk.awaitSettlement(this.aztecTxId, 1);
        this.aztecTxId = undefined;
        return true;
      } catch (err) {
        // Swallow.
      }
    }

    return false;
  }

  private async fund() {
    const toFund = 1000n;
    const balance = await this.sdk.getPublicBalance(this.assetId, this.address);

    if (balance >= toFund) {
      return;
    }

    const value = toFund - balance;
    console.log(`Agent ${this.id} funding with ${value} wei...`);

    const tx = {
      to: this.address.toString(),
      value: `0x${value.toString(16)}`,
    };
    const { hash } = await this.masterWallet.sendTransaction(tx);
    this.ethTxHash = TxHash.fromString(hash);
  }

  private async depositToContract() {
    console.log(`Agent ${this.id} depositing to contract...`);
    const value = 1n;
    await this.sdk.depositFundsToContract({ assetId: this.assetId, value }, this.address);
  }

  private async deposit() {
    console.log(`Agent ${this.id} depositing...`);
    const value = 1n;
    const controller = this.sdk.createDepositController(
      this.aztecUserId,
      this.signer,
      { assetId: this.assetId, value },
      { assetId: this.assetId, value: 0n },
      this.address,
    );
    await controller.createProof();
    await controller.sign();
    await controller.send();
  }

  private async transfer() {
    console.log(`Agent ${this.id} transferring...`);
    const value = 1n;
    const controller = this.sdk.createTransferController(
      this.aztecUserId,
      this.signer,
      { assetId: this.assetId, value },
      { assetId: this.assetId, value: 0n },
      this.aztecUserId,
    );
    await controller.createProof();
    return controller.send();
  }

  private async withdraw() {
    console.log(`Agent ${this.id} withdrawing...`);
    const masterAddress = EthAddress.fromString(this.masterWallet.address);
    const value = 1n;
    const controller = this.sdk.createWithdrawController(
      this.aztecUserId!,
      this.signer,
      { assetId: this.assetId, value },
      { assetId: this.assetId, value: 0n },
      masterAddress,
    );
    await controller.createProof();
    return controller.send();
  }

  public async advanceAgent() {
    if (!(await this.canProceed())) {
      return;
    }

    try {
      await this.nextStep();
      this.step++;
    } catch (err) {
      console.log(err);
    }
  }

  private async nextStep() {
    switch (this.steps[this.step % this.steps.length]) {
      case 'fund':
        return await this.fund();
      case 'depositToContract':
        return await this.depositToContract();
      case 'deposit':
        return await this.deposit();
      case 'transfer':
        return await this.transfer();
      case 'withdraw':
        return await this.withdraw();
    }
  }
}
