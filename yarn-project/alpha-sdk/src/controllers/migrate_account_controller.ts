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
import { DepositHandler } from './deposit_handler.js';

export class MigrateAccountController extends DepositHandler {
  private proofRequestData?: ProofRequestData;
  private proofInputs?: ProofInput[];
  private signatures?: SchnorrSignature[];
  private proofOutputs?: ProofOutput[];
  private txIds?: TxId[];

  constructor(
    public readonly accountPublicKey: GrumpkinAddress,
    public readonly newAccountPublicKey: GrumpkinAddress,
    public readonly newSpendingPublicKey: GrumpkinAddress,
    public readonly recoveryPublicKey: GrumpkinAddress | undefined,
    public readonly deposit: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor = EthAddress.ZERO,
    private aztecWalletProvider: AztecWalletProvider | undefined,
    protected readonly core: CoreSdk,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    super(deposit, fee, depositor, core, blockchain, provider);
  }

  public async createProofRequestData() {
    const spendingPublicKey = await this.getAztecWalletProvider().getSpendingPublicKey();
    this.proofRequestData = await this.core.createAccountProofRequestData(
      this.accountPublicKey,
      spendingPublicKey,
      '',
      this.newAccountPublicKey,
      this.newSpendingPublicKey,
      this.recoveryPublicKey || GrumpkinAddress.ZERO,
      this.deposit,
      this.fee,
      this.depositor,
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
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds) {
      throw new Error(`Call ${!this.proofOutputs ? 'createProofs()' : 'send()'} first.`);
    }

    if (!(await this.core.isAccountAdded(this.newAccountPublicKey))) {
      throw new Error('New account must be added to the sdk before sending proofs in order to track transactions.');
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }

  private getAztecWalletProvider() {
    return this.aztecWalletProvider || this.core.getAztecWalletProvider(this.accountPublicKey);
  }
}
