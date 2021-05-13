import { Wallet } from 'ethers';
import { WalletSdk, WalletProvider, SchnorrSigner, AccountId, AssetId, EthAddress } from '@aztec/sdk';
import { TxHash } from 'barretenberg/tx_hash';
import { utils } from 'ethers';

export class Agent {
  private wallet: Wallet;
  private address: EthAddress;
  private signer!: SchnorrSigner;
  private aztecUserId!: AccountId;
  private step: number;
  private steps: string[];
  private aztecTxHash?: TxHash;
  private ethTxHash?: TxHash;

  constructor(
    private sdk: WalletSdk,
    provider: WalletProvider,
    private id: number,
    private masterWallet: Wallet,
    numTransfers: number,
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

    if (this.aztecTxHash) {
      try {
        await this.sdk.awaitSettlement(this.aztecTxHash, 1);
        this.aztecTxHash = undefined;
        return true;
      } catch (err) {
        // Swallow.
      }
    }

    return false;
  }

  private async fund() {
    const toFund = 1000n;
    const balance = await this.sdk.getPublicBalance(AssetId.ETH, this.address);

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
    await this.sdk.depositFundsToContract(AssetId.ETH, this.address, value);
  }

  private async deposit() {
    console.log(`Agent ${this.id} depositing...`);
    const value = 1n;
    const proof = await this.sdk.createDepositProof(
      AssetId.ETH,
      this.address,
      this.aztecUserId,
      value,
      0n,
      this.signer,
    );
    const signature = await this.sdk.signProof(proof, this.address);
    await this.sdk.sendProof(proof, signature);
  }

  private async transfer() {
    console.log(`Agent ${this.id} transferring...`);
    const value = 1n;
    const proof = await this.sdk.createTransferProof(
      AssetId.ETH,
      this.aztecUserId,
      value,
      0n,
      this.signer,
      this.aztecUserId,
    );
    return await this.sdk.sendProof(proof);
  }

  private async withdraw() {
    console.log(`Agent ${this.id} withdrawing...`);
    const masterAddress = EthAddress.fromString(this.masterWallet.address);
    const value = 1n;
    const proof = await this.sdk.createWithdrawProof(
      AssetId.ETH,
      this.aztecUserId!,
      value,
      0n,
      this.signer,
      masterAddress,
    );
    return await this.sdk.sendProof(proof);
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
