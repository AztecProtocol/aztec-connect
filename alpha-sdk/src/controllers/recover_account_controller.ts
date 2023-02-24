import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { AztecWalletProvider } from '../aztec_wallet_provider/index.js';
import { CoreSdk } from '../core_sdk/index.js';
import { ProofInput, ProofOutput, proofOutputToProofTx, ProofRequestData } from '../proofs/index.js';
import { RecoveryPayload } from '../recovery_payload/index.js';
import { DepositHandler } from './deposit_handler.js';

export class RecoverAccountController extends DepositHandler {
  private proofRequestData?: ProofRequestData;
  private proofInputs?: ProofInput[];
  private signatures?: SchnorrSignature[];
  private proofOutputs?: ProofOutput[];
  private txIds?: TxId[];

  constructor(
    public readonly recoveryPayload: RecoveryPayload,
    public readonly deposit: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    private readonly aztecWalletProvider: AztecWalletProvider,
    protected readonly core: CoreSdk,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    super(deposit, fee, depositor, core, blockchain, provider);
  }

  public async createProofRequestData() {
    const {
      trustedThirdPartyPublicKey,
      recoveryPublicKey,
      recoveryData: { accountPublicKey },
    } = this.recoveryPayload;
    this.proofRequestData = await this.core.createAccountProofRequestData(
      accountPublicKey,
      recoveryPublicKey,
      '',
      accountPublicKey,
      trustedThirdPartyPublicKey,
      GrumpkinAddress.ZERO,
      this.deposit,
      this.fee,
      this.depositor,
    );
    return this.proofRequestData;
  }

  public async createProofInputs() {
    const proofRequestData = this.proofRequestData || (await this.createProofRequestData());
    this.proofInputs = await this.aztecWalletProvider.requestProofInputs(proofRequestData);
    return this.proofInputs;
  }

  public async signProofs() {
    if (!this.proofInputs) {
      throw new Error('Call createProofInputs() first.');
    }

    this.signatures = await this.aztecWalletProvider.signProofs(this.proofInputs);
    return this.signatures;
  }

  public async createProofs() {
    if (this.signatures) {
      this.proofOutputs = await this.aztecWalletProvider.createProofs(this.proofInputs!, this.signatures);
    } else {
      const proofRequestData = this.proofRequestData || (await this.createProofRequestData());
      this.proofOutputs = await this.aztecWalletProvider.requestProofs(proofRequestData);
    }
    this.depositProofOutput = this.proofOutputs.find(p => p.tx.proofId === ProofId.DEPOSIT);
    return this.proofOutputs;
  }

  public exportProofTxs() {
    if (!this.proofOutputs) {
      throw new Error('Call createProofs() first.');
    }

    return this.proofOutputs.map(p =>
      p === this.depositProofOutput ? proofOutputToProofTx(p, this.depositSignature) : proofOutputToProofTx(p),
    );
  }

  public async send() {
    if (!this.proofOutputs) {
      throw new Error('Call createProofs() first.');
    }

    this.txIds = await this.core.sendProofs(this.proofOutputs, this.depositSignature ? [this.depositSignature] : []);
    const accountTxIndex = this.proofOutputs.findIndex(p => p.tx.proofId === ProofId.ACCOUNT);
    return this.txIds[accountTxIndex];
  }

  public getTxIds() {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProof()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    const {
      recoveryData: { accountPublicKey },
    } = this.recoveryPayload;
    if (!(await this.core.isAccountAdded(accountPublicKey))) {
      throw new Error('Account must be added to the sdk before sending proofs in order to track transactions.');
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}
