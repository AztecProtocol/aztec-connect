import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { TxId } from '@aztec/barretenberg/tx_id';
import { CoreSdk } from '../core_sdk/index.js';
import {
  ProofInput,
  ProofOutput,
  proofOutputToProofTx,
  ProofRequestData,
  ProofRequestOptions,
} from '../proofs/index.js';

export class TransferController {
  private proofRequestData?: ProofRequestData;
  private proofInputs?: ProofInput[];
  private signatures?: SchnorrSignature[];
  private proofOutputs?: ProofOutput[];
  private txIds?: TxId[];

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientSpendingKeyRequired: boolean,
    private options: ProofRequestOptions | undefined,
    private readonly core: CoreSdk,
  ) {
    if (!assetValue.value) {
      throw new Error('Value must be greater than 0.');
    }
  }

  public async createProofRequestData() {
    const accountPublicKey = await this.getAztecWalletProvider().getAccountPublicKey();
    const spendingPublicKey = this.options?.useAccountKey
      ? accountPublicKey
      : await this.getAztecWalletProvider().getSpendingPublicKey();
    this.proofRequestData = await this.core.createPaymentProofRequestData(
      ProofId.SEND,
      accountPublicKey,
      spendingPublicKey,
      this.assetValue,
      this.fee,
      EthAddress.ZERO,
      this.recipient,
      this.recipientSpendingKeyRequired,
      this.options,
    );
    return this.proofRequestData;
  }

  public async createProofInputs() {
    const proofRequestData = this.proofRequestData || (await this.createProofRequestData());
    this.proofInputs = await this.getAztecWalletProvider().requestProofInputs(proofRequestData);
    return this.proofInputs;
  }

  public async signProofs() {
    if (!this.proofInputs) {
      throw new Error('Call createProofInputs() first.');
    }

    this.signatures = await this.getAztecWalletProvider().signProofs(this.proofInputs);
    return this.signatures;
  }

  public async createProofs() {
    if (this.signatures) {
      this.proofOutputs = await this.getAztecWalletProvider().createProofs(this.proofInputs!, this.signatures);
    } else {
      const proofRequestData = this.proofRequestData || (await this.createProofRequestData());
      this.proofOutputs = await this.getAztecWalletProvider().requestProofs(proofRequestData);
    }
    return this.proofOutputs;
  }

  public exportProofTxs() {
    if (!this.proofOutputs) {
      throw new Error('Call createProofs() first.');
    }

    return this.proofOutputs.map(p => proofOutputToProofTx(p));
  }

  public async send() {
    if (!this.proofOutputs) {
      throw new Error('Call createProofs() first.');
    }

    this.txIds = await this.core.sendProofs(this.proofOutputs);
    return this.txIds[this.proofOutputs.length - 1];
  }

  public getTxIds() {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  private getAztecWalletProvider() {
    return this.core.getAztecWalletProvider(this.accountPublicKey);
  }
}
