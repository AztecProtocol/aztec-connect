import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetValue, isVirtualAsset } from '@aztec/barretenberg/asset';
import { EthereumProvider, Receipt, SendTxOptions, TxHash, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { randomBytes } from '@aztec/barretenberg/crypto';
import { TxSettlementTime } from '@aztec/barretenberg/rollup_provider';
import { sleep } from '@aztec/barretenberg/sleep';
import { TxId } from '@aztec/barretenberg/tx_id';
import { ClientEthereumBlockchain, validateSignature, Web3Signer } from '@aztec/blockchain';
import { EventEmitter } from 'events';
import {
  AddSpendingKeyController,
  DefiController,
  DepositController,
  FeePayer,
  MigrateAccountController,
  RecoverAccountController,
  RegisterController,
  TransferController,
  WithdrawController,
} from '../controllers';
import { CoreSdkInterface, SdkEvent } from '../core_sdk';
import { SchnorrSigner, Signer } from '../signer';
import { RecoveryData, RecoveryPayload } from '../user';
import { UserAccountTx, UserDefiTx, UserPaymentTx } from '../user_tx';
import { AztecSdkUser } from './aztec_sdk_user';
import { groupUserTxs } from './group_user_txs';

export interface AztecSdk {
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: GrumpkinAddress) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
  on(event: SdkEvent.DESTROYED, listener: () => void): this;
}

export class AztecSdk extends EventEmitter {
  constructor(
    private core: CoreSdkInterface,
    private blockchain: ClientEthereumBlockchain,
    private provider: EthereumProvider,
  ) {
    super();

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

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async isUserSynching(userId: GrumpkinAddress) {
    return this.core.isUserSynching(userId);
  }

  public async awaitUserSynchronised(userId: GrumpkinAddress) {
    return this.core.awaitUserSynchronised(userId);
  }

  public async awaitSettlement(txId: TxId, timeout?: number) {
    return this.core.awaitSettlement(txId, timeout);
  }

  public async awaitDefiDepositCompletion(txId: TxId, timeout?: number) {
    return this.core.awaitDefiDepositCompletion(txId, timeout);
  }

  public async awaitDefiFinalisation(txId: TxId, timeout?: number) {
    return this.core.awaitDefiFinalisation(txId, timeout);
  }

  public async awaitDefiSettlement(txId: TxId, timeout?: number) {
    return this.core.awaitDefiSettlement(txId, timeout);
  }

  public async awaitAllUserTxsSettled() {
    const users = await this.core.getUsersData();
    while (true) {
      const txs = (await Promise.all(users.map(u => this.core.getUserTxs(u.id)))).flat();
      if (txs.every(tx => tx.settled)) {
        break;
      }
      await sleep(1000);
    }
  }

  public async awaitAllUserTxsClaimed() {
    const users = await this.core.getUsersData();
    while (true) {
      const txs = (await Promise.all(users.map(u => this.getDefiTxs(u.id)))).flat();
      if (txs.every(tx => tx.interactionResult.claimSettled)) {
        break;
      }
      await sleep(1000);
    }
  }

  public async getLocalStatus() {
    return this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.core.getRemoteStatus();
  }

  public async isAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.core.isAccountRegistered(accountPublicKey);
  }

  public async isRemoteAccountRegistered(accountPublicKey: GrumpkinAddress) {
    return this.core.isRemoteAccountRegistered(accountPublicKey);
  }

  public async isAliasRegistered(alias: string) {
    return this.core.isAliasRegistered(alias);
  }

  public async isRemoteAliasRegistered(alias: string) {
    return this.core.isRemoteAliasRegistered(alias);
  }

  public async accountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    return this.core.accountExists(accountPublicKey, alias);
  }

  public async remoteAccountExists(accountPublicKey: GrumpkinAddress, alias: string) {
    return this.core.remoteAccountExists(accountPublicKey, alias);
  }

  public async getAccountPublicKey(alias: string) {
    return this.core.getAccountPublicKey(alias);
  }

  public async getRemoteUnsettledAccountPublicKey(alias: string) {
    return this.core.getRemoteUnsettledAccountPublicKey(alias);
  }

  public async getTxFees(assetId: number) {
    return this.core.getTxFees(assetId);
  }

  public async userExists(accountPublicKey: GrumpkinAddress) {
    return this.core.userExists(accountPublicKey);
  }

  public async addUser(accountPrivateKey: Buffer, noSync = false) {
    const userData = await this.core.addUser(accountPrivateKey, noSync);
    return new AztecSdkUser(userData.id, this);
  }

  public async removeUser(userId: GrumpkinAddress) {
    return this.core.removeUser(userId);
  }

  /**
   * Returns a AztecSdkUser for a locally resolved user.
   */
  public async getUser(userId: GrumpkinAddress) {
    const userData = await this.getUserData(userId); // Check that the user's been added to the sdk.
    return new AztecSdkUser(userData.id, this);
  }

  public async getUserData(userId: GrumpkinAddress) {
    return this.core.getUserData(userId);
  }

  public async getUsersData() {
    return this.core.getUsersData();
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
    return this.core.derivePublicKey(privateKey);
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

  public async mint({ assetId, value }: AssetValue, account: EthAddress, provider?: EthereumProvider) {
    return this.blockchain.getAsset(assetId).mint(value, account, { provider });
  }

  public async setSupportedAsset(assetAddress: EthAddress, assetGasLimit?: number, options?: SendTxOptions) {
    return this.blockchain.setSupportedAsset(assetAddress, assetGasLimit, options);
  }

  public getBridgeAddressId(address: EthAddress, gasLimit?: number) {
    return this.blockchain.getBridgeAddressId(address, gasLimit);
  }

  public async setSupportedBridge(bridgeAddress: EthAddress, bridgeGasLimit?: number, options?: SendTxOptions) {
    return this.blockchain.setSupportedBridge(bridgeAddress, bridgeGasLimit, options);
  }

  public async processAsyncDefiInteraction(interactionNonce: number, options?: SendTxOptions) {
    return this.blockchain.processAsyncDefiInteraction(interactionNonce, options);
  }

  private async getTransactionFees(assetId: number, txType: TxType) {
    const fees = await this.core.getTxFees(assetId);
    const txSettlementFees = fees[txType];
    if (await this.isFeePayingAsset(assetId)) {
      return txSettlementFees;
    }
    const [feeTxTransferFee] = fees[TxType.TRANSFER];
    return txSettlementFees.map(({ value, ...rest }) => ({ value: value + feeTxTransferFee.value, ...rest }));
  }

  public async getDepositFees(assetId: number) {
    return this.getTransactionFees(assetId, TxType.DEPOSIT);
  }

  public createDepositController(
    depositor: EthAddress,
    value: AssetValue,
    fee: AssetValue,
    recipient: GrumpkinAddress,
    recipientAccountRequired = true,
    feePayer?: FeePayer,
    provider = this.provider,
  ) {
    return new DepositController(
      value,
      fee,
      depositor,
      recipient,
      recipientAccountRequired,
      feePayer,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getWithdrawFees(assetId: number, recipient?: EthAddress) {
    const txType =
      recipient && (await this.isContract(recipient)) ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET;
    return this.getTransactionFees(assetId, txType);
  }

  public createWithdrawController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    value: AssetValue,
    fee: AssetValue,
    to: EthAddress,
  ) {
    return new WithdrawController(userId, userSigner, value, fee, to, this.core);
  }

  public async getTransferFees(assetId: number) {
    return this.getTransactionFees(assetId, TxType.TRANSFER);
  }

  public createTransferController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    value: AssetValue,
    fee: AssetValue,
    recipient: GrumpkinAddress,
    recipientAccountRequired = true,
  ) {
    return new TransferController(userId, userSigner, value, fee, recipient, recipientAccountRequired, this.core);
  }

  public async getDefiFees(bridgeId: BridgeId, userId?: GrumpkinAddress, depositValue?: AssetValue) {
    if (depositValue && depositValue.assetId !== bridgeId.inputAssetIdA) {
      throw new Error('Inconsistent asset ids.');
    }

    const defiFees = await this.core.getDefiFees(bridgeId);
    const { assetId: feeAssetId, value: minDefiFee } = defiFees[0];
    const requireFeePayingTx = feeAssetId !== bridgeId.inputAssetIdA;
    const requireJoinSplitTx = await (async () => {
      if (!userId || !depositValue) {
        return true;
      }

      const { value } = depositValue;
      const privateInput = value + (!requireFeePayingTx ? minDefiFee : BigInt(0));

      if (bridgeId.inputAssetIdB === undefined) {
        const notes = await this.core.pickNotes(userId, bridgeId.inputAssetIdA, privateInput);
        return notes.reduce((sum, n) => sum + n.value, BigInt(0)) !== privateInput;
      }

      return (
        (await this.core.pickNote(userId, bridgeId.inputAssetIdA, privateInput))?.value !== privateInput ||
        (await this.core.pickNote(userId, bridgeId.inputAssetIdB, value))?.value !== value
      );
    })();

    const [minTransferFee] = (await this.core.getTxFees(feeAssetId))[TxType.TRANSFER];
    // Always include the fee for an extra join split tx if the user is willing to pay higher fee.
    const additionalFees = [
      minTransferFee.value * BigInt(+requireFeePayingTx + +requireJoinSplitTx),
      minTransferFee.value * BigInt(+requireFeePayingTx + 1),
      minTransferFee.value * BigInt(+requireFeePayingTx + 1),
    ];

    return defiFees.map((defiFee, i) => ({
      ...defiFee,
      value: defiFee.value + additionalFees[i],
    }));
  }

  public createDefiController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    bridgeId: BridgeId,
    value: AssetValue,
    fee: AssetValue,
  ) {
    return new DefiController(userId, userSigner, bridgeId, value, fee, this.core);
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

  public async getRegisterFees({ assetId, value: depositValue }: AssetValue): Promise<AssetValue[]> {
    const txFees = await this.core.getTxFees(assetId);
    const [depositFee] = txFees[TxType.DEPOSIT];
    return txFees[TxType.ACCOUNT].map(({ value, ...rest }) => ({
      ...rest,
      value: value || depositValue ? value + depositFee.value : value,
    }));
  }

  public createRegisterController(
    userId: GrumpkinAddress,
    alias: string,
    accountPrivateKey: Buffer,
    spendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    feePayer?: FeePayer,
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
      feePayer,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getRecoverAccountFees(assetId: number) {
    return this.getAccountFee(assetId);
  }

  public createRecoverAccountController(
    alias: string,
    recoveryPayload: RecoveryPayload,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    provider = this.provider,
  ) {
    return new RecoverAccountController(
      alias,
      recoveryPayload,
      deposit,
      fee,
      depositor,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getAddSpendingKeyFees(assetId: number) {
    return this.getAccountFee(assetId);
  }

  public createAddSpendingKeyController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    alias: string,
    spendingPublicKey1: GrumpkinAddress,
    spendingPublicKey2: GrumpkinAddress | undefined,
    fee: AssetValue,
  ) {
    return new AddSpendingKeyController(
      userId,
      userSigner,
      alias,
      spendingPublicKey1,
      spendingPublicKey2,
      fee,
      this.core,
    );
  }

  public async getMigrateAccountFees(assetId: number) {
    return this.getAccountFee(assetId);
  }

  public createMigrateAccountController(
    userId: GrumpkinAddress,
    userSigner: Signer,
    alias: string,
    newAccountPrivateKey: Buffer,
    newSpendingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    fee: AssetValue,
  ) {
    return new MigrateAccountController(
      userId,
      userSigner,
      alias,
      newAccountPrivateKey,
      newSpendingPublicKey,
      recoveryPublicKey,
      fee,
      this.core,
    );
  }

  public async depositFundsToContract({ assetId, value }: AssetValue, from: EthAddress, provider = this.provider) {
    return this.blockchain.depositPendingFunds(assetId, value, undefined, {
      signingAddress: from,
      provider,
    });
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress) {
    return this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async getUserPendingFunds(assetId: number, account: EthAddress) {
    const deposited = await this.getUserPendingDeposit(assetId, account);
    const txs = await this.getRemoteUnsettledPaymentTxs();
    const unsettledDeposit = txs
      .filter(
        tx =>
          tx.proofData.proofData.proofId === ProofId.DEPOSIT &&
          tx.proofData.publicAssetId === assetId &&
          tx.proofData.publicOwner.equals(account),
      )
      .reduce((sum, tx) => sum + BigInt(tx.proofData.publicValue), BigInt(0));
    return deposited - unsettledDeposit;
  }

  public async isContract(address: EthAddress) {
    return this.blockchain.isContract(address);
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }

  public async getTransactionReceipt(txHash: TxHash, timeout?: number, interval = 1): Promise<Receipt> {
    return this.blockchain.getTransactionReceipt(txHash, timeout, interval);
  }

  public async flushRollup(userId: GrumpkinAddress, userSigner: Signer) {
    const fee = (await this.getTransferFees(0))[TxSettlementTime.INSTANT];
    const feeProofInput = await this.core.createPaymentProofInput(
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
    feeProofInput.signature = await userSigner.signMessage(feeProofInput.signingData);
    const feeProofOutput = await this.core.createPaymentProof(feeProofInput, 0);
    const [txId] = await this.core.sendProofs([feeProofOutput]);
    await this.core.awaitSettlement(txId);
  }

  public async getSpendingKeys(userId: GrumpkinAddress) {
    return this.core.getSpendingKeys(userId);
  }

  public async getPublicBalance(ethAddress: EthAddress, assetId: number) {
    return { assetId, value: await this.blockchain.getAsset(assetId).balanceOf(ethAddress) };
  }

  public async getBalances(userId: GrumpkinAddress) {
    return this.core.getBalances(userId);
  }

  public async getBalancesUnsafe(accountPublicKey: GrumpkinAddress) {
    return this.core.getBalances(accountPublicKey, true);
  }

  public async getBalance(userId: GrumpkinAddress, assetId: number) {
    return { assetId, value: await this.core.getBalance(userId, assetId) };
  }

  public async getBalanceUnsafe(accountPublicKey: GrumpkinAddress, assetId: number) {
    return { assetId, value: await this.core.getBalance(accountPublicKey, assetId, true) };
  }

  public async getFormattedBalance(userId: GrumpkinAddress, assetId: number, symbol = true, precision?: number) {
    return this.fromBaseUnits(await this.getBalance(userId, assetId), symbol, precision);
  }

  public async getSpendableSum(userId: GrumpkinAddress, assetId: number, excludePendingNotes?: boolean) {
    return this.core.getSpendableSum(userId, assetId, excludePendingNotes);
  }

  public async getSpendableSumUnsafe(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    excludePendingNotes?: boolean,
  ) {
    return this.core.getSpendableSum(accountPublicKey, assetId, excludePendingNotes, true);
  }

  public async getSpendableSums(userId: GrumpkinAddress, excludePendingNotes?: boolean) {
    return this.core.getSpendableSums(userId, excludePendingNotes);
  }

  public async getSpendableSumsUnsafe(accountPublicKey: GrumpkinAddress, excludePendingNotes?: boolean) {
    return this.core.getSpendableSums(accountPublicKey, excludePendingNotes, true);
  }

  public async getMaxSpendableValue(
    userId: GrumpkinAddress,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
  ) {
    if (numNotes !== undefined && (numNotes > 2 || numNotes < 1)) {
      throw new Error(`numNotes can only be 1 or 2. Got ${numNotes}.`);
    }
    return this.core.getMaxSpendableValue(userId, assetId, numNotes, excludePendingNotes);
  }

  public async getMaxSpendableValueUnsafe(
    accountPublicKey: GrumpkinAddress,
    assetId: number,
    numNotes?: number,
    excludePendingNotes?: boolean,
  ) {
    if (numNotes !== undefined && (numNotes > 2 || numNotes < 1)) {
      throw new Error(`numNotes can only be 1 or 2. Got ${numNotes}.`);
    }
    return this.core.getMaxSpendableValue(accountPublicKey, assetId, numNotes, excludePendingNotes, true);
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

  public async getRemoteUnsettledPaymentTxs() {
    return this.core.getRemoteUnsettledPaymentTxs();
  }

  private async getAccountFee(assetId: number) {
    const txFees = await this.core.getTxFees(assetId);
    const [minFee, ...fees] = txFees[TxType.ACCOUNT];
    const [transferFee] = txFees[TxType.TRANSFER];
    return [{ ...minFee, value: minFee.value ? minFee.value + transferFee.value : minFee.value }, ...fees];
  }
}
