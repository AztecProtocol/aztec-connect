import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, isVirtualAsset } from '@aztec/barretenberg/asset';
import { EthereumProvider, Receipt, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { Blake2s, keccak256, randomBytes } from '@aztec/barretenberg/crypto';
import { retryUntil } from '@aztec/barretenberg/retry';
import {
  BridgePublishQuery,
  BridgePublishQueryResult,
  DefiSettlementTime,
  Tx,
  TxSettlementTime,
} from '@aztec/barretenberg/rollup_provider';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { roundUp } from '@aztec/barretenberg/rounding';
import { DecodedBlock } from '@aztec/barretenberg/block_source';
import { ClientEthereumBlockchain, validateSignature, Web3Signer } from '@aztec/blockchain';
import { EventEmitter } from 'events';
import {
  AddSpendingKeyController,
  DefiController,
  DepositController,
  FeeController,
  MigrateAccountController,
  RecoverAccountController,
  RegisterController,
  TransferController,
  WithdrawController,
  createTxRefNo,
} from '../controllers/index.js';
import { CoreSdk, SdkEvent } from '../core_sdk/index.js';
import { ProofOutput } from '../proofs/index.js';
import { SchnorrSigner, Signer } from '../signer/index.js';
import { RecoveryData, RecoveryPayload } from '../user/index.js';
import { UserAccountTx, UserDefiTx, UserPaymentTx } from '../user_tx/index.js';
import { AztecSdkUser } from './aztec_sdk_user.js';
import { FeeCalculator, GetFeesOptions } from './fee_calculator.js';
import { groupUserTxs } from './group_user_txs.js';
import { TxValueCalculator, GetMaxTxValueOptions } from './tx_value_calculator.js';

export { GetFeesOptions, GetMaxTxValueOptions };

export interface AztecSdk {
  on(event: SdkEvent.VERSION_MISMATCH, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: GrumpkinAddress) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (syncedToRollup: number, latestRollupId: number) => void): this;
  on(event: SdkEvent.DESTROYED, listener: (error?: string) => void): this;
}

export class AztecSdk extends EventEmitter {
  private feeCalculator: FeeCalculator;
  private txValueCalculator: TxValueCalculator;

  constructor(private core: CoreSdk, private blockchain: ClientEthereumBlockchain, private provider: EthereumProvider) {
    super();

    this.feeCalculator = new FeeCalculator(core, blockchain);
    this.txValueCalculator = new TxValueCalculator(core, blockchain);

    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }
  }

  public async run() {
    await this.core.run();
  }

  public async destroy() {
    await this.core.destroy();
    this.removeAllListeners();
  }

  public async awaitSynchronised(timeout?: number) {
    return await this.core.awaitSynchronised(timeout);
  }

  public async isUserSynching(userId: GrumpkinAddress) {
    return await this.core.isUserSynching(userId);
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress, timeout?: number) {
    return await this.core.awaitUserSynchronised(userId, timeout);
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    return await this.core.awaitSettlement(txId, timeout);
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    return await this.core.awaitDefiDepositCompletion(txId, timeout);
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    return await this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    return await this.core.awaitDefiSettlement(txId, timeout);
  }

  public async awaitAllUserTxsSettled(timeout?: number) {
    const accountPublicKeys = await this.core.getUsers();
    const allUserTxsSettled = async () => {
      const txs = (await Promise.all(accountPublicKeys.map(pk => this.core.getUserTxs(pk)))).flat();
      return txs.every(tx => tx.settled);
    };
    await retryUntil(allUserTxsSettled, 'all user txs settled', timeout);
  }

  public async awaitAllUserTxsClaimed(timeout?: number) {
    const accountPublicKeys = await this.core.getUsers();
    const allUserTxsClaimed = async () => {
      const txs = (await Promise.all(accountPublicKeys.map(pk => this.getDefiTxs(pk)))).flat();
      return txs.every(tx => tx.interactionResult.claimSettled);
    };
    await retryUntil(allUserTxsClaimed, 'all user txs claimed', timeout);
  }

  public async getLocalStatus() {
    return await this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return await this.core.getRemoteStatus();
  }

  public async sendConsoleLog(clientData?: string[], preserveLog = false) {
    await this.core.sendConsoleLog(clientData, preserveLog);
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress, includePending = false) {
    return await this.core.isAccountRegistered(accountPublicKey, includePending);
  }

  public async isAliasRegistered(alias: string, includePending = false) {
    return await this.core.isAliasRegistered(alias, includePending);
  }

  public async isAliasRegisteredToAccount(accountPublicKey: GrumpkinAddress, alias: string, includePending = false) {
    return await this.core.isAliasRegisteredToAccount(accountPublicKey, alias, includePending);
  }

  public async getAccountPublicKey(alias: string) {
    return await this.core.getAccountPublicKey(alias);
  }

  public async getAccountIndex(alias: string) {
    return await this.core.getAccountIndex(alias);
  }

  public async getTxFees(assetId: number, { feeSignificantFigures = 0 } = {}) {
    const txFees = await this.core.getTxFees(assetId);
    return txFees.map(fees =>
      fees.map((fee): AssetValue => ({ ...fee, value: roundUp(fee.value, feeSignificantFigures) })),
    );
  }

  public async queryDefiPublishStats(query: BridgePublishQuery): Promise<BridgePublishQueryResult> {
    return await this.core.queryDefiPublishStats(query);
  }

  public async userExists(accountPublicKey: GrumpkinAddress) {
    return await this.core.userExists(accountPublicKey);
  }

  public async addUser(accountPrivateKey: Buffer, registrationSync = false, registrationSyncMarginBlocks = 10) {
    const userId = await this.core.addUser(accountPrivateKey, registrationSync, registrationSyncMarginBlocks);
    return new AztecSdkUser(userId, this);
  }

  public async removeUser(userId: GrumpkinAddress) {
    return await this.core.removeUser(userId);
  }

  /**
   * Returns a AztecSdkUser for a locally resolved user.
   */
  public async getUser(userId: GrumpkinAddress) {
    if (!(await this.core.userExists(userId))) {
      throw new Error(`User not found: ${userId}`);
    }
    return new AztecSdkUser(userId, this);
  }

  public async getUserSyncedToRollup(userId: GrumpkinAddress) {
    return await this.core.getUserSyncedToRollup(userId);
  }

  public async getUsers() {
    return await this.core.getUsers();
  }

  public getAccountKeySigningData() {
    return Buffer.from(
      'Sign this message to generate your Aztec Privacy Key. This key lets the application decrypt your balance on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.',
    );
  }

  public getSpendingKeySigningData() {
    return Buffer.from(
      'Sign this message to generate your Aztec Spending Key. This key lets the application spend your funds on Aztec.\n\nIMPORTANT: Only sign this message if you trust the application.',
    );
  }

  public async generateAccountKeyPair(account: EthAddress, provider = this.provider) {
    const ethSigner = new Web3Signer(provider);
    const signingData = this.getAccountKeySigningData();
    const signature = await ethSigner.signPersonalMessage(signingData, account);
    const privateKey = signature.slice(0, 32);
    const publicKey = await this.derivePublicKey(privateKey);
    return { publicKey, privateKey };
  }

  public async generateSpendingKeyPair(account: EthAddress, provider = this.provider) {
    const ethSigner = new Web3Signer(provider);
    const signingData = this.getSpendingKeySigningData();
    const signature = await ethSigner.signPersonalMessage(signingData, account);
    const privateKey = signature.slice(0, 32);
    const publicKey = await this.derivePublicKey(privateKey);
    return { publicKey, privateKey };
  }

  public async createSchnorrSigner(privateKey: Buffer) {
    const publicKey = await this.core.derivePublicKey(privateKey);
    return new SchnorrSigner(this.core, publicKey, privateKey);
  }

  public async derivePublicKey(privateKey: Buffer) {
    return await this.core.derivePublicKey(privateKey);
  }

  public async deriveLegacySigningMessageHash(address: EthAddress) {
    const barretenberg = await BarretenbergWasm.new();
    const blake2s = new Blake2s(barretenberg);
    const signingMessage = blake2s.hashToField(address.toBuffer());
    return Promise.resolve(keccak256(signingMessage));
  }

  public getAssetIdByAddress(address: EthAddress, gasLimit?: number) {
    return this.blockchain.getAssetIdByAddress(address, gasLimit);
  }

  public getAssetIdBySymbol(symbol: string, gasLimit?: number) {
    return this.blockchain.getAssetIdBySymbol(symbol, gasLimit);
  }

  public fromBaseUnits({ assetId, value }: AssetValue, symbol = false, precision?: number) {
    if (isVirtualAsset(assetId)) {
      const nonce = assetId - 2 ** 29;
      const v = value.toLocaleString('en');
      return symbol ? `${v} (nonce ${nonce})` : v;
    }
    const v = this.blockchain.getAsset(assetId).fromBaseUnits(value, precision);
    return symbol ? `${v} ${this.getAssetInfo(assetId).symbol}` : v;
  }

  public toBaseUnits(assetId: number, value: string) {
    if (isVirtualAsset(assetId)) {
      return { assetId, value: BigInt(value.replaceAll(',', '')) };
    }
    return { assetId, value: this.blockchain.getAsset(assetId).toBaseUnits(value) };
  }

  public getAssetInfo(assetId: number) {
    return this.blockchain.getAsset(assetId).getStaticInfo();
  }

  public async isFeePayingAsset(assetId: number) {
    if (isVirtualAsset(assetId)) {
      return false;
    }
    return (await this.core.getLocalStatus()).feePayingAssetIds.includes(assetId);
  }

  public isVirtualAsset(assetId: number) {
    return isVirtualAsset(assetId);
  }

  public async mint({ assetId, value }: AssetValue, account: EthAddress, options?: SendTxOptions) {
    return await this.blockchain.getAsset(assetId).mint(value, account, options);
  }

  public async setSupportedAsset(assetAddress: EthAddress, assetGasLimit?: number, options?: SendTxOptions) {
    return await this.blockchain.setSupportedAsset(assetAddress, assetGasLimit, options);
  }

  public getBridgeAddressId(address: EthAddress, gasLimit?: number) {
    return this.blockchain.getBridgeAddressId(address, gasLimit);
  }

  public async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit?: number, options?: SendTxOptions) {
    return await this.blockchain.setSupportedBridge(bridgeAddress, bridgeGasLimit, options);
  }

  public async processAsyncDefiInteraction(interactionNonce: number, options?: SendTxOptions) {
    return await this.blockchain.processAsyncDefiInteraction(interactionNonce, options);
  }

  public async getDepositFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getDepositFees(assetId, options);
  }

  public async getPendingDepositTxs() {
    return await this.core.getPendingDepositTxs();
  }

  public createDepositController(
    depositor: EthAddress,
    assetValue: AssetValue,
    fee: AssetValue,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired = false,
    provider = this.provider,
  ) {
    return new DepositController(
      assetValue,
      fee,
      depositor,
      recipient,
      recipientSpendingKeyRequired,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getWithdrawFees(
    assetId: number,
    options?: GetFeesOptions & { recipient?: EthAddress; assetValue?: AssetValue },
  ) {
    return await this.feeCalculator.getWithdrawFees(assetId, options);
  }

  public async getMaxWithdrawValue(
    userId: GrumpkinAddress,
    assetId: number,
    options?: GetMaxTxValueOptions & { recipient?: EthAddress },
  ) {
    return await this.txValueCalculator.getMaxWithdrawValue(userId, assetId, options);
  }

  public createWithdrawController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    assetValue: AssetValue,
    fee: AssetValue,
    to: EthAddress,
  ) {
    return new WithdrawController(userId, userSigner, assetValue, fee, to, this.core);
  }

  public async getTransferFees(assetId: number, options?: GetFeesOptions & { assetValue?: AssetValue }) {
    return await this.feeCalculator.getTransferFees(assetId, options);
  }

  public async getMaxTransferValue(userId: GrumpkinAddress, assetId: number, options?: GetMaxTxValueOptions) {
    return await this.txValueCalculator.getMaxTransferValue(userId, assetId, options);
  }

  public createTransferController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    assetValue: AssetValue,
    fee: AssetValue,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired = false,
  ) {
    return new TransferController(
      userId,
      userSigner,
      assetValue,
      fee,
      recipient,
      recipientSpendingKeyRequired,
      this.core,
    );
  }

  public async getDefiFees(bridgeCallData: BridgeCallData, options?: GetFeesOptions & { assetValue?: AssetValue }) {
    return await this.feeCalculator.getDefiFees(bridgeCallData, options);
  }

  public async getMaxDefiValue(
    userId: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    options?: Omit<GetMaxTxValueOptions, 'txSettlementTime'> & { txSettlementTime?: DefiSettlementTime },
  ) {
    return await this.txValueCalculator.getMaxDefiValue(userId, bridgeCallData, options);
  }

  public createDefiController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    bridgeCallData: BridgeCallData,
    assetValue: AssetValue,
    fee: AssetValue,
  ) {
    return new DefiController(userId, userSigner, bridgeCallData, assetValue, fee, this.core);
  }

  public async generateAccountRecoveryData(
    accountPublicKey: GrumpkinAddress,
    alias: string,
    trustedThirdPartyPublicKeys: GrumpkinAddress[],
  ) {
    const socialRecoverySigner = await this.createSchnorrSigner(randomBytes(32));
    const recoveryPublicKey = socialRecoverySigner.getPublicKey();

    return Promise.all(
      trustedThirdPartyPublicKeys.map(async trustedThirdPartyPublicKey => {
        const signingData = await this.core.createAccountProofSigningData(
          accountPublicKey,
          alias,
          false,
          recoveryPublicKey,
          undefined,
          trustedThirdPartyPublicKey,
        );
        const signature = await socialRecoverySigner.signMessage(signingData);
        const recoveryData = new RecoveryData(accountPublicKey, signature);
        return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
      }),
    );
  }

  public async getRegisterFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getRegisterFees(assetId, options);
  }

  public createRegisterController(
    userId: GrumpkinAddress,
    alias: string,
    accountPrivateKey: Buffer,
    spendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor?: EthAddress,
    provider = this.provider,
  ) {
    return new RegisterController(
      userId,
      alias,
      accountPrivateKey,
      spendingPublicKey,
      recoveryPublicKey,
      deposit,
      fee,
      depositor,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getRecoverAccountFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getRecoverAccountFees(assetId, options);
  }

  public createRecoverAccountController(
    recoveryPayload: RecoveryPayload,
    deposit: AssetValue,
    fee: AssetValue,
    depositor?: EthAddress,
    provider = this.provider,
  ) {
    return new RecoverAccountController(recoveryPayload, deposit, fee, depositor, this.core, this.blockchain, provider);
  }

  public async getAddSpendingKeyFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getAddSpendingKeyFees(assetId, options);
  }

  public createAddSpendingKeyController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    spendingPublicKey1: GrumpkinAddress,
    spendingPublicKey2: GrumpkinAddress | undefined,
    fee: AssetValue,
  ) {
    return new AddSpendingKeyController(userId, userSigner, spendingPublicKey1, spendingPublicKey2, fee, this.core);
  }

  public async getMigrateAccountFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getMigrateAccountFees(assetId, options);
  }

  public createMigrateAccountController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    newAccountPrivateKey: Buffer,
    newSpendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor?: EthAddress,
    provider = this.provider,
  ) {
    return new MigrateAccountController(
      userId,
      userSigner,
      newAccountPrivateKey,
      newSpendingPublicKey,
      recoveryPublicKey,
      deposit,
      fee,
      depositor,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getProofTxsFees(assetId: number, proofTxs: Tx[], options?: GetFeesOptions) {
    const proofs = proofTxs.map(p => p.proofData);
    return await this.feeCalculator.getProofDataFees(assetId, proofs, options);
  }

  public createFeeController(userId: GrumpkinAddress, userSigner: Signer, proofTxs: Tx[], fee: AssetValue) {
    return new FeeController(userId, userSigner, proofTxs, fee, this.core);
  }

  public async depositFundsToContract({ assetId, value }: AssetValue, from: EthAddress, provider = this.provider) {
    return await this.blockchain.depositPendingFunds(assetId, value, undefined, {
      signingAddress: from,
      provider,
    });
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return await this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async getUserPendingFunds(assetId: number, account: EthAddress) {
    const deposited = await this.getUserPendingDeposit(assetId, account);
    const txs = await this.getPendingDepositTxs();
    const unsettledDeposit = txs
      .filter(tx => tx.assetId === assetId && tx.publicOwner.equals(account))
      .reduce((sum, tx) => sum + tx.value, BigInt(0));
    return deposited - unsettledDeposit;
  }

  public async isContract(address: EthAddress) {
    return await this.blockchain.isContract(address);
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }

  public async getTransactionReceipt(txHash: TxHash, timeout?: number, interval = 1): Promise<Receipt> {
    return await this.blockchain.getTransactionReceipt(txHash, timeout, interval);
  }

  public async flushRollup(userId: GrumpkinAddress, userSigner: Signer) {
    const assetId = 0;
    const userSpendingKeyRequired = !userSigner.getPublicKey().equals(userId);
    const fee = (
      await this.getTransferFees(assetId, {
        userId,
        userSpendingKeyRequired,
        assetValue: { assetId, value: BigInt(0) },
      })
    )[TxSettlementTime.INSTANT];
    const proofInputs = await this.core.createPaymentProofInputs(
      userId,
      fee.assetId,
      BigInt(0),
      BigInt(0),
      fee.value,
      BigInt(0),
      BigInt(0),
      undefined,
      true,
      undefined,
      userSigner.getPublicKey(),
      2,
    );
    const txRefNo = proofInputs.length > 1 ? createTxRefNo() : 0;
    const proofs: ProofOutput[] = [];
    for (const proofInput of proofInputs) {
      proofInput.signature = await userSigner.signMessage(proofInput.signingData);
      proofs.push(await this.core.createPaymentProof(proofInput, txRefNo));
    }
    const txIds = await this.core.sendProofs(proofs);
    await Promise.all(txIds.map(txId => this.core.awaitSettlement(txId)));
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    return await this.core.getSpendingKeys(userId);
  }

  public async getPublicBalance(ethAddress: EthAddress, assetId: number) {
    return { assetId, value: await this.blockchain.getAsset(assetId).balanceOf(ethAddress) };
  }

  public async getBalances(userId: GrumpkinAddress) {
    return await this.core.getBalances(userId);
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number) {
    return { assetId, value: await this.core.getBalance(userId, assetId) };
  }

  public async getFormattedBalance(userId: GrumpkinAddress, assetId: number, symbol = true, precision?: number) {
    return this.fromBaseUnits(await this.getBalance(userId, assetId), symbol, precision);
  }

  public async getSpendableSum(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
  ) {
    return await this.core.getSpendableSum(userId, assetId, spendingKeyRequired, excludePendingNotes);
  }

  public async getSpendableSums(userId: GrumpkinAddress, spendingKeyRequired?: boolean, excludePendingNotes?: boolean) {
    return await this.core.getSpendableSums(userId, spendingKeyRequired, excludePendingNotes);
  }

  public async getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    spendingKeyRequired?: boolean,
    excludePendingNotes?: boolean,
    numNotes?: number,
  ) {
    const values = await this.core.getMaxSpendableNoteValues(
      userId,
      assetId,
      spendingKeyRequired,
      excludePendingNotes,
      numNotes,
    );
    return values.reduce((sum, v) => sum + v, BigInt(0));
  }

  public async getUserTxs(userId: GrumpkinAddress) {
    const txs = await this.core.getUserTxs(userId);
    return groupUserTxs(txs);
  }

  public async getPaymentTxs(userId: GrumpkinAddress) {
    return (await this.getUserTxs(userId)).filter(tx =>
      [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(tx.proofId),
    ) as UserPaymentTx[];
  }

  public async getAccountTxs(userId: GrumpkinAddress) {
    return (await this.getUserTxs(userId)).filter(tx => tx.proofId === ProofId.ACCOUNT) as UserAccountTx[];
  }

  public async getDefiTxs(userId: GrumpkinAddress) {
    return (await this.getUserTxs(userId)).filter(tx => tx.proofId === ProofId.DEFI_DEPOSIT) as UserDefiTx[];
  }

  public async getBlocks(from: number, take = 1): Promise<DecodedBlock[]> {
    return await this.core.getBlocks(from, take);
  }

  // Exposing for medici. Remove once they have proper multisig api.
  public getCoreSdk() {
    return this.core;
  }
}
