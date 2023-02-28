import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { BridgeCallData, validateBridgeCallData } from '@aztec/barretenberg/bridge_call_data';
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

export class DefiController {
  private proofRequestData?: ProofRequestData;
  private proofInputs?: ProofInput[];
  private signatures?: SchnorrSignature[];
  private proofOutputs?: ProofOutput[];
  private txIds?: TxId[];

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly bridgeCallData: BridgeCallData,
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    private options: ProofRequestOptions | undefined,
    private readonly core: CoreSdk,
  ) {
    if (!assetValue.value) {
      throw new Error('Deposit value must be greater than 0.');
    }

    if (
      assetValue.assetId !== bridgeCallData.inputAssetIdA &&
      (bridgeCallData.inputAssetIdB === undefined || assetValue.assetId !== bridgeCallData.inputAssetIdB)
    ) {
      throw new Error(
        `Incorrect deposit asset. Expect ${bridgeCallData.inputAssetIdA}${
          bridgeCallData.inputAssetIdB !== undefined ? ` or ${bridgeCallData.inputAssetIdB}` : ''
        }. Got ${assetValue.assetId}.`,
      );
    }

    validateBridgeCallData(bridgeCallData);

    if (fee.value && fee.assetId === bridgeCallData.inputAssetIdB) {
      throw new Error('Fee paying asset cannot be the second input asset.');
    }
  }

  public async createProofRequestData() {
    const accountPublicKey = await this.getAztecWalletProvider().getAccountPublicKey();
    const spendingPublicKey = this.options?.useAccountKey
      ? accountPublicKey
      : await this.getAztecWalletProvider().getSpendingPublicKey();
    this.proofRequestData = await this.core.createDefiProofRequestData(
      accountPublicKey,
      spendingPublicKey,
      this.bridgeCallData,
      this.assetValue,
      this.fee,
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
    return this.getDefiTxId();
  }

  public getTxIds() {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitDefiDepositCompletion(timeout?: number) {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  public async awaitDefiFinalisation(timeout?: number) {
    const txId = this.getDefiTxId();
    await this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitSettlement(timeout?: number) {
    const txId = this.getDefiTxId();
    await this.core.awaitDefiSettlement(txId, timeout);
  }

  public getInteractionNonce() {
    const txId = this.getDefiTxId();
    return this.core.getDefiInteractionNonce(txId);
  }

  private getDefiTxId() {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    const defiTxIndex = this.proofOutputs!.findIndex(p => p.tx.proofId === ProofId.DEFI_DEPOSIT);
    return this.txIds[defiTxIndex];
  }

  private getAztecWalletProvider() {
    return this.core.getAztecWalletProvider(this.accountPublicKey);
  }
}
