import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { SchnorrSignature } from '@aztec/barretenberg/crypto';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { AztecWalletProvider } from '../aztec_wallet_provider/index.js';
import { CoreSdk } from '../core_sdk/index.js';
import { ConstantKeyStore } from '../key_store/index.js';
import { ProofInput, ProofOutput, proofOutputToProofTx, ProofRequestData } from '../proofs/index.js';
import { DepositHandler } from './deposit_handler.js';

export class DepositController extends DepositHandler {
  private proofRequestData?: ProofRequestData;
  private proofInputs?: ProofInput[];
  private signatures?: SchnorrSignature[];
  private proofOutputs?: ProofOutput[];
  private txIds?: TxId[];

  constructor(
    public readonly assetValue: AssetValue,
    public readonly fee: AssetValue,
    public readonly depositor: EthAddress,
    public readonly recipient: GrumpkinAddress,
    public readonly recipientSpendingKeyRequired: boolean,
    private aztecWalletProvider: AztecWalletProvider | undefined, // This can be a provider with a random account.
    protected readonly core: CoreSdk,
    blockchain: ClientEthereumBlockchain,
    provider: EthereumProvider,
  ) {
    super(assetValue, fee, depositor, core, blockchain, provider);
  }

  public async createProofRequestData() {
    if (!this.aztecWalletProvider) {
      throw new Error('Please provide an AztecWalletProvider.');
    }

    const accountPublicKey = await this.aztecWalletProvider.getAccountPublicKey();
    const spendingPublicKey = accountPublicKey;
    this.proofRequestData = await this.core.createPaymentProofRequestData(
      ProofId.DEPOSIT,
      accountPublicKey,
      spendingPublicKey,
      this.assetValue,
      this.fee,
      this.depositor,
      this.recipient,
      this.recipientSpendingKeyRequired,
    );
    return this.proofRequestData;
  }

  public async createProofInputs() {
    if (!this.aztecWalletProvider) {
      throw new Error('Please provide an AztecWalletProvider.');
    }

    const proofRequestData = this.proofRequestData || (await this.createProofRequestData());
    this.proofInputs = await this.aztecWalletProvider.requestProofInputs(proofRequestData);
    return this.proofInputs;
  }

  public async signProofs() {
    if (!this.proofInputs) {
      throw new Error('Call createProofInputs() first.');
    }

    this.signatures = await this.aztecWalletProvider!.signProofs(this.proofInputs);
    return this.signatures;
  }

  public async createProofs() {
    if (!this.aztecWalletProvider) {
      const keyPair = this.core.createRandomKeyPair();
      const keyStore = new ConstantKeyStore(keyPair, keyPair);
      this.aztecWalletProvider = await this.core.createAztecWalletProvider(keyStore);
      await this.aztecWalletProvider.connect();
    }
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
    const depositTxIndex = this.proofOutputs.findIndex(p => p.tx.proofId === ProofId.DEPOSIT);
    return this.txIds[depositTxIndex];
  }

  public getTxIds() {
    if (!this.txIds) {
      throw new Error('Call send() first.');
    }

    return this.txIds;
  }

  public async awaitSettlement(timeout?: number) {
    if (!this.txIds) {
      throw new Error('Call send() first.');
    }

    if (
      !(await this.core.isAccountAdded(this.recipient)) &&
      !(await this.core.isAccountAdded(await this.aztecWalletProvider!.getAccountPublicKey()))
    ) {
      throw new Error(
        'Recipient or sender must be added to the sdk before sending proofs in order to track transactions.',
      );
    }

    await Promise.all(this.txIds.map(txId => this.core.awaitSettlement(txId, timeout)));
  }
}
