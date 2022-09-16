import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdkInterface } from '../core_sdk';
import { ProofOutput, proofOutputToProofTx } from '../proofs';
import { SchnorrSigner } from '../signer';
import { createTxRefNo } from './create_tx_ref_no';
import { DepositHandler } from './deposit_handler';

export class RegisterController extends DepositHandler {
  private proofOutput?: ProofOutput;
  private txIds: TxId[] = [];
  private requireDeposit: boolean;

  constructor(
    public readonly userId: GrumpkinAddress,
    public readonly alias: string,
    private readonly accountPrivateKey: Buffer,
    public readonly spendingPublicKey: GrumpkinAddress,
    public readonly recoveryPublicKey: GrumpkinAddress | undefined,
    public readonly deposit: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor = EthAddress.ZERO,
    protected readonly core: CoreSdkInterface,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    super(deposit, fee, depositor, userId, true, core, blockchain, provider);
    this.requireDeposit = !!this.publicInput.value;
  }

  public async createProof() {
    const accountPublicKey = await this.core.derivePublicKey(this.accountPrivateKey);
    if (!accountPublicKey.equals(this.userId)) {
      throw new Error('`accountPrivateKey` does not belong to the user.');
    }

    const txRefNo = this.requireDeposit ? createTxRefNo() : 0;

    if (this.requireDeposit) {
      await super.createProof(txRefNo);
    }

    const proofInput = await this.core.createAccountProofInput(
      this.userId,
      accountPublicKey,
      false,
      this.alias,
      this.spendingPublicKey,
      this.recoveryPublicKey,
      undefined,
    );
    const signer = new SchnorrSigner(this.core, accountPublicKey, this.accountPrivateKey);
    proofInput.signature = await signer.signMessage(proofInput.signingData);
    this.proofOutput = await this.core.createAccountProof(proofInput, txRefNo);
  }

  public exportProofTxs() {
    return this.getProofOutputs().map(proofOutputToProofTx);
  }

  public async send() {
    if (!(await this.core.userExists(this.userId))) {
      throw new Error('Add the user to the sdk first.');
    }

    const proofs = this.getProofOutputs();
    this.txIds = await this.core.sendProofs(proofs);
    return this.txIds[0];
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error(`Call ${!this.proofOutput ? 'createProof()' : 'send()'} first.`);
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  private getProofOutputs() {
    if (!this.proofOutput) {
      throw new Error('Call createProof() first.');
    }

    const proofOutputs = [this.proofOutput];
    if (this.requireDeposit) {
      proofOutputs.push(super.getProofOutput());
    }
    return proofOutputs;
  }
}
