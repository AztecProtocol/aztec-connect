import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdk } from '../core_sdk/index.js';
import { proofOutputToProofTx } from '../proofs/index.js';
import { DepositHandler } from './deposit_handler.js';

export class DepositController extends DepositHandler {
  private txIds: TxId[] = [];

  constructor(
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientSpendingKeyRequired: boolean,
    protected readonly core: CoreSdk,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    super(assetValue, fee, depositor, recipient, recipientSpendingKeyRequired, core, blockchain, provider);
  }

  public async createProof(timeout?: number) {
    // txRefNo is not required for creating a single deposit proof.
    await super.createProof(0, timeout);
  }

  public exportProofTxs() {
    return [super.getProofOutput()].map(proofOutputToProofTx);
  }

  public async send() {
    this.txIds = await this.core.sendProofs([super.getProofOutput()]);
    return this.txIds[0];
  }

  public getTxIds() {
    if (!this.txIds.length) {
      throw new Error('Call send() first.');
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds.length) {
      throw new Error('Call send() first.');
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}
