import { AccountId } from '@aztec/barretenberg/account_id';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId, AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider, Receipt, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ProofId } from '@aztec/barretenberg/client_proofs';
import { getBlockchainStatus } from '@aztec/barretenberg/service';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ClientEthereumBlockchain, validateSignature } from '@aztec/blockchain';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { SdkEvent, SdkInitState } from '../sdk';
import { Signer } from '../signer';
import { RecoveryData, RecoveryPayload } from '../user';
import { UserAccountTx, UserDefiTx, UserPaymentTx } from '../user_tx';
import {
  AddSigningKeyController,
  DefiController,
  DepositController,
  MigrateAccountController,
  RecoverAccountController,
  RegisterController,
  TransferController,
  WithdrawController,
} from './controllers';
import { groupUserTxs } from './group_user_txs';
import { WalletSdkUser } from './wallet_sdk_user';

export * from './wallet_sdk_user';

const debug = createDebug('bb:wallet_sdk');

export async function createWalletSdk(
  ethereumProvider: EthereumProvider,
  serverUrl: string,
  sdkOptions: SdkOptions = {},
) {
  if (sdkOptions.debug) {
    createDebug.enable('bb:*');
  }

  const { assets, rollupContractAddress, chainId } = await getBlockchainStatus(serverUrl);

  const core = await createSdk(serverUrl, sdkOptions);

  // Set erase flag if requested or contract changed.
  if (sdkOptions.clearDb || !(await core.getRollupContractAddress())?.equals(rollupContractAddress)) {
    debug('erasing database');
    await core.eraseDb();
  }

  const blockchain = new ClientEthereumBlockchain(rollupContractAddress, assets, ethereumProvider);

  const providerChainId = await blockchain.getChainId();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }

  return new WalletSdk(core, blockchain, ethereumProvider, sdkOptions);
}

export interface WalletSdk {
  on(event: SdkEvent.LOG, listener: (msg: string) => void): this;
  on(event: SdkEvent.UPDATED_INIT_STATE, listener: (initState: SdkInitState, message?: string) => void): this;
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: AccountId) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
}

export class WalletSdk extends EventEmitter {
  constructor(
    private core: CoreSdk,
    private blockchain: ClientEthereumBlockchain,
    private provider: EthereumProvider,
    private sdkOptions: SdkOptions = {},
  ) {
    super();
  }

  public static create(ethereumProvider: EthereumProvider, serverUrl: string, sdkOptions: SdkOptions = {}) {
    return createWalletSdk(ethereumProvider, serverUrl, sdkOptions);
  }

  public async init() {
    // Forward all core sdk events.
    for (const e in SdkEvent) {
      const event = (SdkEvent as any)[e];
      this.core.on(event, (...args: any[]) => this.emit(event, ...args));
    }

    await this.core.init();
  }

  public async destroy() {
    await this.core?.destroy();
    this.removeAllListeners();
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public isUserSynching(userId: AccountId) {
    return this.core.isUserSynching(userId);
  }

  public async awaitUserSynchronised(userId: AccountId) {
    return this.core.awaitUserSynchronised(userId);
  }

  public async awaitSettlement(txHash: TxHash, timeout?: number) {
    return this.core.awaitSettlement(txHash, timeout);
  }

  public getLocalStatus() {
    return this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.core.getRemoteStatus();
  }

  public async getTxFees(assetId: AssetId) {
    return this.core.getTxFees(assetId);
  }

  public async getLatestAccountNonce(publicKey: GrumpkinAddress) {
    return this.core.getLatestAccountNonce(publicKey);
  }

  public async getRemoteLatestAccountNonce(publicKey: GrumpkinAddress) {
    return this.core.getRemoteLatestAccountNonce(publicKey);
  }

  public async getLatestAliasNonce(alias: string) {
    return this.core.getLatestAliasNonce(alias);
  }

  public async getRemoteLatestAliasNonce(alias: string) {
    return this.core.getRemoteLatestAliasNonce(alias);
  }

  public async getAccountId(alias: string, nonce?: number) {
    return this.core.getAccountId(alias, nonce);
  }

  public async getRemoteAccountId(alias: string, nonce?: number) {
    return this.core.getRemoteAccountId(alias, nonce);
  }

  public async isAliasAvailable(alias: string) {
    return this.core.isAliasAvailable(alias);
  }

  public async isRemoteAliasAvailable(alias: string) {
    return this.core.isRemoteAliasAvailable(alias);
  }

  public async userExists(userId: AccountId) {
    return this.core.userExists(userId);
  }

  public async addUser(privateKey: Buffer, nonce?: number, noSync = false) {
    const userData = await this.core.addUser(privateKey, nonce, noSync);
    return new WalletSdkUser(userData.id, this);
  }

  public async removeUser(userId: AccountId) {
    return this.core.removeUser(userId);
  }

  /**
   * Returns a WalletSdkUser for a locally resolved user.
   */
  public getUser(userId: AccountId) {
    const userData = this.getUserData(userId); // Check that the user's been added to the sdk.
    return new WalletSdkUser(userData.id, this);
  }

  public getUserData(userId: AccountId) {
    return this.core.getUserData(userId);
  }

  public getUsersData() {
    return this.core.getUsersData();
  }

  public createSchnorrSigner(privateKey: Buffer) {
    return this.core.createSchnorrSigner(privateKey);
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.core.derivePublicKey(privateKey);
  }

  public fromBaseUnits(assetId: AssetId, value: bigint, precision?: number) {
    return this.blockchain.getAsset(assetId).fromBaseUnits(value, precision);
  }

  public toBaseUnits(assetId: AssetId, value: string) {
    return this.blockchain.getAsset(assetId).toBaseUnits(value);
  }

  public getAssetInfo(assetId: AssetId) {
    return this.blockchain.getAsset(assetId).getStaticInfo();
  }

  public async mint(assetId: AssetId, value: bigint, account: EthAddress, provider?: EthereumProvider) {
    return this.blockchain.getAsset(assetId).mint(value, account, { provider });
  }

  public async getDepositFees(assetId: AssetId) {
    return (await this.core.getTxFees(assetId))[TxType.DEPOSIT];
  }

  public createDepositController(
    userId: AccountId,
    userSigner: Signer,
    value: AssetValue,
    fee: AssetValue,
    from: EthAddress,
    to = userId,
    provider = this.provider,
  ) {
    return new DepositController(userId, userSigner, value, fee, from, to, this.core, this.blockchain, provider);
  }

  public async getWithdrawFees(assetId: AssetId, recipient?: EthAddress) {
    const txType =
      recipient && (await this.isContract(recipient)) ? TxType.WITHDRAW_TO_CONTRACT : TxType.WITHDRAW_TO_WALLET;
    return (await this.core.getTxFees(assetId))[txType];
  }

  public createWithdrawController(
    userId: AccountId,
    userSigner: Signer,
    value: AssetValue,
    fee: AssetValue,
    to: EthAddress,
  ) {
    return new WithdrawController(userId, userSigner, value, fee, to, this.core);
  }

  public async getTransferFees(assetId: AssetId) {
    return (await this.core.getTxFees(assetId))[TxType.TRANSFER];
  }

  public createTransferController(
    userId: AccountId,
    userSigner: Signer,
    value: AssetValue,
    fee: AssetValue,
    to: AccountId,
  ) {
    return new TransferController(userId, userSigner, value, fee, to, this.core);
  }

  public async getDefiFees(bridgeId: BridgeId, allowPendingBalance = false, userId?: AccountId, depositValue?: bigint) {
    const defiFees = await this.core.getDefiFees(bridgeId);
    const { assetId } = defiFees[0];
    const requireSplit = await (async () => {
      if (allowPendingBalance) {
        return false;
      }
      if (!userId || !depositValue) {
        return true;
      }
      const privateInput = depositValue + defiFees[0].value;
      const notes = await this.core.pickNotes(userId, assetId, privateInput);
      return notes?.reduce((sum, n) => sum + n.value, BigInt(0)) !== privateInput;
    })();

    if (!requireSplit) {
      return defiFees;
    }

    const [minFee, ...fees] = defiFees;
    const [minTransferFee] = (await this.core.getTxFees(assetId))[TxType.TRANSFER];
    return [{ ...minFee, value: minFee.value + minTransferFee.value }, ...fees];
  }

  public createDefiController(
    userId: AccountId,
    userSigner: Signer,
    bridgeId: BridgeId,
    value: AssetValue,
    fee: AssetValue,
  ) {
    return new DefiController(userId, userSigner, bridgeId, value, fee, this.core);
  }

  public async generateAccountRecoveryData(
    alias: string,
    publicKey: GrumpkinAddress,
    trustedThirdPartyPublicKeys: GrumpkinAddress[],
    nonce?: number,
  ) {
    const accountNonce = nonce !== undefined ? nonce : (await this.core.getLatestAccountNonce(publicKey)) + 1;
    const accountId = new AccountId(publicKey, accountNonce);
    const socialRecoverySigner = this.core.createSchnorrSigner(randomBytes(32));
    const recoveryPublicKey = socialRecoverySigner.getPublicKey();

    return Promise.all(
      trustedThirdPartyPublicKeys.map(async trustedThirdPartyPublicKey => {
        const signingData = await this.core.createAccountProofSigningData(
          recoveryPublicKey,
          alias,
          accountNonce,
          false,
          publicKey,
          undefined,
          trustedThirdPartyPublicKey,
        );
        const signature = await socialRecoverySigner.signMessage(signingData);
        const recoveryData = new RecoveryData(accountId, signature);
        return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
      }),
    );
  }

  public async getRegisterFees(assetId: AssetId, depositValue = BigInt(0)): Promise<AssetValue[]> {
    const txFees = await this.core.getTxFees(assetId);
    const [depositFee] = txFees[TxType.DEPOSIT];
    return txFees[TxType.ACCOUNT].map(({ value, ...rest }) => ({
      ...rest,
      value: value || depositValue ? value + depositFee.value : value,
    }));
  }

  public createRegisterController(
    userId: AccountId,
    alias: string,
    signingPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    deposit: AssetValue,
    fee: AssetValue,
    depositor: EthAddress,
    provider = this.provider,
  ) {
    return new RegisterController(
      userId,
      alias,
      signingPublicKey,
      recoveryPublicKey,
      deposit,
      fee,
      depositor,
      this.core,
      this.blockchain,
      provider,
    );
  }

  public async getRecoverAccountFees(assetId: AssetId) {
    return this.getAccountFee(assetId);
  }

  public createRecoverAccountController(recoveryPayload: RecoveryPayload, fee: AssetValue) {
    return new RecoverAccountController(recoveryPayload, fee, this.core);
  }

  public async getAddSigningKeyFees(assetId: AssetId) {
    return this.getAccountFee(assetId);
  }

  public createAddSigningKeyController(
    userId: AccountId,
    userSigner: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2: GrumpkinAddress | undefined,
    fee: AssetValue,
  ) {
    return new AddSigningKeyController(userId, userSigner, signingPublicKey1, signingPublicKey2, fee, this.core);
  }

  public async getMigrateAccountFees(assetId: AssetId) {
    return this.getAccountFee(assetId);
  }

  public createMigrateAccountController(
    userId: AccountId,
    userSigner: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey: GrumpkinAddress | undefined,
    newAccountPrivateKey: Buffer | undefined,
    fee: AssetValue,
  ) {
    return new MigrateAccountController(
      userId,
      userSigner,
      newSigningPublicKey,
      recoveryPublicKey,
      newAccountPrivateKey,
      fee,
      this.core,
    );
  }

  public async depositFundsToContract({ assetId, value }: AssetValue, from: EthAddress, provider = this.provider) {
    return this.blockchain.depositPendingFunds(assetId, value, from, undefined, undefined, provider);
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async isContract(address: EthAddress) {
    return this.blockchain.isContract(address);
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }

  public async getTransactionReceipt(txHash: TxHash, interval = 1, timeout = 300): Promise<Receipt> {
    const { minConfirmation, minConfirmationEHW } = this.sdkOptions;
    const confs =
      minConfirmationEHW !== undefined && (await this.core.getRemoteStatus()).blockchainStatus.escapeOpen
        ? minConfirmationEHW
        : minConfirmation || 0;
    return this.blockchain.getTransactionReceipt(txHash, interval, timeout, confs);
  }

  public async getSigningKeys(userId: AccountId) {
    return this.core.getSigningKeys(userId);
  }

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    return this.blockchain.getAsset(assetId).balanceOf(ethAddress);
  }

  public getBalance(assetId: AssetId, userId: AccountId) {
    return this.core.getBalance(assetId, userId);
  }

  public async getMaxSpendableValue(assetId: AssetId, userId: AccountId) {
    return this.core.getMaxSpendableValue(assetId, userId);
  }

  public async getSpendableNotes(assetId: AssetId, userId: AccountId) {
    return this.core.getSpendableNotes(assetId, userId);
  }

  public async getSpendableSum(assetId: AssetId, userId: AccountId) {
    return this.core.getSpendableSum(assetId, userId);
  }

  public async getNotes(userId: AccountId) {
    return this.core.getNotes(userId);
  }

  public async getUserTxs(userId: AccountId) {
    const txs = await this.core.getUserTxs(userId);
    return groupUserTxs(txs);
  }

  public async getPaymentTxs(userId: AccountId) {
    return (await this.getUserTxs(userId)).filter(tx =>
      [ProofId.DEPOSIT, ProofId.WITHDRAW, ProofId.SEND].includes(tx.proofId),
    ) as UserPaymentTx[];
  }

  public async getAccountTxs(userId: AccountId) {
    return (await this.getUserTxs(userId)).filter(tx => tx.proofId === ProofId.ACCOUNT) as UserAccountTx[];
  }

  public async getDefiTxs(userId: AccountId) {
    return (await this.getUserTxs(userId)).filter(tx => tx.proofId === ProofId.DEFI_DEPOSIT) as UserDefiTx[];
  }

  public async getRemoteUnsettledAccountTxs() {
    return this.core.getRemoteUnsettledAccountTxs();
  }

  public async getRemoteUnsettledPaymentTxs() {
    return this.core.getRemoteUnsettledPaymentTxs();
  }

  private async getAccountFee(assetId: AssetId) {
    const txFees = await this.core.getTxFees(assetId);
    const [minFee, ...fees] = txFees[TxType.ACCOUNT];
    const [transferFee] = txFees[TxType.TRANSFER];
    return [{ ...minFee, value: minFee.value ? minFee.value + transferFee.value : minFee.value }, ...fees];
  }
}
