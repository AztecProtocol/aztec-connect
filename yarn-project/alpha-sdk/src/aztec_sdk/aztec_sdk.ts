import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, isVirtualAsset } from '@aztec/barretenberg/asset';
import { EthereumProvider, Receipt, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
import { DecodedBlock } from '@aztec/barretenberg/block_source';
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
import { roundUp } from '@aztec/barretenberg/rounding';
import { TxId } from '@aztec/barretenberg/tx_id';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { ClientEthereumBlockchain, validateSignature } from '@aztec/blockchain';
import { EventEmitter } from 'events';
import { AztecWalletProvider } from '../aztec_wallet_provider/aztec_wallet_provider.js';
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
} from '../controllers/index.js';
import { CoreSdk, SdkEvent } from '../core_sdk/index.js';
import { KeyStore, Permission, RecoveryKit } from '../key_store/index.js';
import { NotePickerOptions } from '../note_picker/index.js';
import { ProofOutput, ProofRequestOptions } from '../proofs/index.js';
import { RecoveryData, RecoveryPayload } from '../recovery_payload/index.js';
import { SchnorrSigner } from '../signer/index.js';
import { UserAccountTx, UserDefiTx, UserPaymentTx } from '../user_tx/index.js';
import { FeeCalculator, GetFeesOptions } from './fee_calculator.js';
import { groupTxs } from './group_txs.js';
import { GetMaxTxValueOptions, TxValueCalculator } from './tx_value_calculator.js';

export { GetFeesOptions, GetMaxTxValueOptions };

export interface AztecSdk {
  on(event: SdkEvent.VERSION_MISMATCH, listener: () => void): this;
  on(event: SdkEvent.UPDATED_ACCOUNT_STATE, listener: (accountPublicKey: GrumpkinAddress) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (syncedToRollup: number, latestRollupId: number) => void): this;
  on(event: SdkEvent.DESTROYED, listener: () => void): this;
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
      this.core.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
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

  public async isAccountSynching(accountPublicKey: GrumpkinAddress) {
    return await this.core.isAccountSynching(accountPublicKey);
  }

  public async awaitAccountSynchronised(accountPublicKey: GrumpkinAddress, timeout?: number) {
    return await this.core.awaitAccountSynchronised(accountPublicKey, timeout);
  }

  public async getAccountSyncedToRollup(accountPublicKey: GrumpkinAddress) {
    return await this.core.getAccountSyncedToRollup(accountPublicKey);
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

  public async awaitAllTxsSettled(timeout?: number) {
    const accountPublicKeys = await this.core.getAccounts();
    const allTxsSettled = async () => {
      const txs = (await Promise.all(accountPublicKeys.map(pk => this.core.getTxs(pk)))).flat();
      return txs.every(tx => tx.settled);
    };
    await retryUntil(allTxsSettled, 'all txs settled', timeout);
  }

  public async awaitAllTxsClaimed(timeout?: number) {
    const accountPublicKeys = await this.core.getAccounts();
    const allTxsClaimed = async () => {
      const txs = (await Promise.all(accountPublicKeys.map(pk => this.getDefiTxs(pk)))).flat();
      return txs.every(tx => tx.interactionResult.claimSettled);
    };
    await retryUntil(allTxsClaimed, 'all txs claimed', timeout);
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

  public async isAccountAdded(accountPublicKey: GrumpkinAddress) {
    return await this.core.isAccountAdded(accountPublicKey);
  }

  public async addAccount(aztecWalletProvider: AztecWalletProvider, noSync?: boolean) {
    return await this.core.addAccount(aztecWalletProvider, noSync);
  }

  public async removeAccount(accountPublicKey: GrumpkinAddress) {
    return await this.core.removeAccount(accountPublicKey);
  }

  public async getAccounts() {
    return await this.core.getAccounts();
  }

  public createLegacyKeyStore(account: EthAddress, permissions: Permission[] = [], provider = this.provider) {
    return this.core.createLegacyKeyStore(account, permissions, provider);
  }

  public createKeyStore(permissions: Permission[] = []) {
    return this.core.createKeyStore(permissions);
  }

  public decryptKeyPairs(encryptedKeys: Buffer, userPassword: string) {
    return this.core.decryptKeyPairs(encryptedKeys, userPassword);
  }

  public recoverAccountKey(recoveryKit: RecoveryKit, provider: EthereumProvider, account: EthAddress) {
    return this.core.recoverAccountKey(recoveryKit, provider, account);
  }

  public createSchnorrSigner(privateKey: Buffer) {
    const publicKey = this.core.derivePublicKey(privateKey);
    return Promise.resolve(new SchnorrSigner(this.core, publicKey, privateKey));
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.core.derivePublicKey(privateKey);
  }

  public deriveMultiSigPublicKey(privateKey: Buffer) {
    return this.core.deriveMultiSigPublicKey(privateKey);
  }

  public combineMultiSigPublicKeys(publicKeys: Buffer[]) {
    return this.core.combineMultiSigPublicKeys(publicKeys);
  }

  public generateMultiSigData() {
    return this.core.generateMultiSigData();
  }

  public createMultiSigSignature(
    message: Buffer,
    publicKeys: Buffer[],
    publicOutputs: Buffer[],
    privateKey: Buffer,
    privateOutput: Buffer,
  ) {
    return this.core.createMultiSigSignature(message, publicKeys, publicOutputs, privateKey, privateOutput);
  }

  public combineMultiSigSignatures(
    message: Buffer,
    publicKeys: Buffer[],
    publicOutputs: Buffer[],
    signatures: Buffer[],
  ) {
    return this.core.combineMultiSigSignatures(message, publicKeys, publicOutputs, signatures);
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
    aztecWalletProvider?: AztecWalletProvider,
    provider = this.provider,
  ) {
    return new DepositController(
      assetValue,
      fee,
      depositor,
      recipient,
      recipientSpendingKeyRequired,
      aztecWalletProvider,
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
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    options?: GetMaxTxValueOptions & { recipient?: EthAddress },
  ) {
    return await this.txValueCalculator.getMaxWithdrawValue(accountPublicKey, assetId, options);
  }

  public createWithdrawController(
    accountPublicKey: GrumpkinAddress,
    assetValue: AssetValue,
    fee: AssetValue,
    to: EthAddress,
    options?: ProofRequestOptions,
  ) {
    return new WithdrawController(accountPublicKey, assetValue, fee, to, options, this.core);
  }

  public async getTransferFees(assetId: number, options?: GetFeesOptions & { assetValue?: AssetValue }) {
    return await this.feeCalculator.getTransferFees(assetId, options);
  }

  public async getMaxTransferValue(accountPublicKey: GrumpkinAddress, assetId: number, options?: GetMaxTxValueOptions) {
    return await this.txValueCalculator.getMaxTransferValue(accountPublicKey, assetId, options);
  }

  public createTransferController(
    accountPublicKey: GrumpkinAddress,
    assetValue: AssetValue,
    fee: AssetValue,
    recipient: GrumpkinAddress,
    recipientSpendingKeyRequired = false,
    options?: ProofRequestOptions,
  ) {
    return new TransferController(
      accountPublicKey,
      assetValue,
      fee,
      recipient,
      recipientSpendingKeyRequired,
      options,
      this.core,
    );
  }

  public async getDefiFees(bridgeCallData: BridgeCallData, options?: GetFeesOptions & { assetValue?: AssetValue }) {
    return await this.feeCalculator.getDefiFees(bridgeCallData, options);
  }

  public async getMaxDefiValue(
    accountPublicKey: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    options?: Omit<GetMaxTxValueOptions, 'txSettlementTime'> & { txSettlementTime?: DefiSettlementTime },
  ) {
    return await this.txValueCalculator.getMaxDefiValue(accountPublicKey, bridgeCallData, options);
  }

  public createDefiController(
    accountPublicKey: GrumpkinAddress,
    bridgeCallData: BridgeCallData,
    assetValue: AssetValue,
    fee: AssetValue,
    options?: ProofRequestOptions,
  ) {
    return new DefiController(accountPublicKey, bridgeCallData, assetValue, fee, options, this.core);
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
        const aztecWalletProvider = this.core.getAztecWalletProvider(accountPublicKey);
        const { spendingKeyAccount, ...proofRequestData } = await this.core.createAccountProofRequestData(
          accountPublicKey,
          GrumpkinAddress.ZERO, // spendingPublicKey - set it to zero so the sdk won't try to get the hash path for it.
          alias,
          accountPublicKey,
          trustedThirdPartyPublicKey,
          GrumpkinAddress.ZERO,
          { assetId: 0, value: BigInt(0) },
          { assetId: 0, value: BigInt(0) },
          EthAddress.ZERO,
        );
        // Set the spendingPublicKey to recoveryPublicKey.
        const { signingData } = (
          await aztecWalletProvider.requestProofInputs({
            ...proofRequestData,
            spendingKeyAccount: { ...spendingKeyAccount, spendingPublicKey: recoveryPublicKey },
          })
        )[0];

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
    accountPublicKey: GrumpkinAddress,
    alias: string,
    spendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    aztecWalletProvider?: AztecWalletProvider,
    provider = this.provider,
  ) {
    return new RegisterController(
      accountPublicKey,
      alias,
      spendingPublicKey,
      recoveryPublicKey,
      deposit,
      fee,
      depositor,
      aztecWalletProvider,
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
    depositor: EthAddress,
    aztecWalletProvider: AztecWalletProvider,
    provider = this.provider,
  ) {
    return new RecoverAccountController(
      recoveryPayload,
      deposit,
      fee,
      depositor,
      aztecWalletProvider,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getAddSpendingKeyFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getAddSpendingKeyFees(assetId, options);
  }

  public createAddSpendingKeyController(
    accountPublicKey: GrumpkinAddress,
    spendingPublicKey1: GrumpkinAddress,
    spendingPublicKey2: GrumpkinAddress | undefined,
    fee: AssetValue,
    aztecWalletProvider?: AztecWalletProvider,
    options?: ProofRequestOptions,
  ) {
    return new AddSpendingKeyController(
      accountPublicKey,
      spendingPublicKey1,
      spendingPublicKey2,
      fee,
      aztecWalletProvider,
      options,
      this.core,
    );
  }

  public async getMigrateAccountFees(assetId: number, options?: { feeSignificantFigures?: number }) {
    return await this.feeCalculator.getMigrateAccountFees(assetId, options);
  }

  public createMigrateAccountController(
    accountPublicKey: GrumpkinAddress,
    newAccountPublicKey: GrumpkinAddress,
    newSpendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor?: EthAddress,
    aztecWalletProvider?: AztecWalletProvider,
    provider = this.provider,
  ) {
    return new MigrateAccountController(
      accountPublicKey,
      newAccountPublicKey,
      newSpendingPublicKey,
      recoveryPublicKey,
      deposit,
      fee,
      depositor,
      aztecWalletProvider,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getProofTxsFees(assetId: number, proofTxs: Tx[], options?: GetFeesOptions) {
    const proofs = proofTxs.map(p => p.proofData);
    return await this.feeCalculator.getProofDataFees(assetId, proofs, options);
  }

  public createFeeController(
    accountPublicKey: GrumpkinAddress,
    proofTxs: Tx[],
    fee: AssetValue,
    options?: ProofRequestOptions,
  ) {
    return new FeeController(accountPublicKey, proofTxs, fee, options, this.core);
  }

  public async sendProofs(proofs: ProofOutput[]) {
    return await this.core.sendProofs(proofs);
  }

  public async depositFundsToContract({ assetId, value }: AssetValue, from: EthAddress, provider = this.provider) {
    return await this.blockchain.depositPendingFunds(assetId, value, undefined, {
      signingAddress: from,
      provider,
    });
  }

  public async getPendingDeposit(assetId: number, account: EthAddress) {
    return await this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async getPendingFunds(assetId: number, account: EthAddress) {
    const deposited = await this.getPendingDeposit(assetId, account);
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

  public async flushRollup(accountPublicKey: GrumpkinAddress, accountSpendingKeyRequired = false) {
    const assetId = 0;
    const fee = (
      await this.getTransferFees(assetId, {
        accountPublicKey,
        spendingKeyRequired: accountSpendingKeyRequired,
        assetValue: { assetId, value: BigInt(0) },
      })
    )[TxSettlementTime.INSTANT];
    const controller = this.createFeeController(accountPublicKey, [], fee, {
      useAccountKey: !accountSpendingKeyRequired,
    });
    await controller.createProofs();
    const txId = await controller.send();
    await this.core.awaitSettlement(txId);
  }

  public async getSpendingKeys(accountPublicKey: GrumpkinAddress) {
    return await this.core.getSpendingKeys(accountPublicKey);
  }

  public async getPublicBalance(ethAddress: EthAddress, assetId: number) {
    return { assetId, value: await this.blockchain.getAsset(assetId).balanceOf(ethAddress) };
  }

  public async getBalances(accountPublicKey: GrumpkinAddress) {
    return await this.core.getBalances(accountPublicKey);
  }

  public async getBalance(accountPublicKey: GrumpkinAddress, assetId: number) {
    return { assetId, value: await this.core.getBalance(accountPublicKey, assetId) };
  }

  public async getFormattedBalance(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    symbol = true,
    precision?: number,
  ) {
    return this.fromBaseUnits(await this.getBalance(accountPublicKey, assetId), symbol, precision);
  }

  public async getSpendableSum(accountPublicKey: GrumpkinAddress, assetId: number, options?: NotePickerOptions) {
    return await this.core.getSpendableSum(accountPublicKey, assetId, options);
  }

  public async getSpendableSums(accountPublicKey: GrumpkinAddress, options?: NotePickerOptions) {
    return await this.core.getSpendableSums(accountPublicKey, options);
  }

  public async getMaxSpendableValue(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    options?: NotePickerOptions & { numNotes?: number },
  ) {
    const values = await this.core.getMaxSpendableNoteValues(accountPublicKey, assetId, options);
    return values.reduce((sum, v) => sum + v, BigInt(0));
  }

  public async getTxs(accountPublicKey: GrumpkinAddress) {
    const txs = await this.core.getTxs(accountPublicKey);
    return groupTxs(txs);
  }

  public async getPaymentTxs(accountPublicKey: GrumpkinAddress) {
    return (await this.getTxs(accountPublicKey)).filter(tx =>
      [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(tx.proofId),
    ) as UserPaymentTx[];
  }

  public async getAccountTxs(accountPublicKey: GrumpkinAddress) {
    return (await this.getTxs(accountPublicKey)).filter(tx => tx.proofId === ProofId.ACCOUNT) as UserAccountTx[];
  }

  public async getDefiTxs(accountPublicKey: GrumpkinAddress) {
    return (await this.getTxs(accountPublicKey)).filter(tx => tx.proofId === ProofId.DEFI_DEPOSIT) as UserDefiTx[];
  }

  public createRandomKeyPair() {
    return this.core.createRandomKeyPair();
  }

  public async createAztecWalletProvider(keyStore: KeyStore) {
    return await this.core.createAztecWalletProvider(keyStore);
  }

  public async getBlocks(from: number, take = 1): Promise<DecodedBlock[]> {
    return await this.core.getBlocks(from, take);
  }

  // Exposing for medici. Remove once they have proper multisig api.
  public getCoreSdk() {
    return this.core;
  }
}
