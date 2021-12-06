import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { EthereumProvider, EthereumSigner, PermitArgs, Receipt, TxType } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { SettlementTime } from '@aztec/barretenberg/rollup_provider';
import { getBlockchainStatus } from '@aztec/barretenberg/service';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { ClientEthereumBlockchain, createPermitData, validateSignature, Web3Signer } from '@aztec/blockchain';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { ProofOutput } from '../proofs/proof_output';
import { SdkEvent, SdkInitState } from '../sdk';
import { RecoverSignatureSigner, Signer } from '../signer';
import { AccountId, AliasHash, RecoveryData, RecoveryPayload } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';

export * from '@aztec/barretenberg/asset';
export * from './wallet_sdk_user';
export * from './wallet_sdk_user_asset';

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
  const ethSigner = new Web3Signer(ethereumProvider);

  const providerChainId = await blockchain.getChainId();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }

  return new WalletSdk(core, blockchain, ethSigner, sdkOptions);
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
    private ethSigner: EthereumSigner,
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

  public async getFee(assetId: AssetId, txType: TxType, speed = SettlementTime.SLOW) {
    return this.core.getFee(assetId, txType, speed);
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
    const userData = this.getUserData(userId);
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

  public async approve(assetId: AssetId, value: bigint, account: EthAddress, provider?: EthereumProvider) {
    const { rollupContractAddress } = this.getLocalStatus();
    return this.blockchain.getAsset(assetId).approve(value, account, rollupContractAddress, { provider });
  }

  public async createPermitData(assetId: AssetId, from: EthAddress, value: bigint, deadline: bigint) {
    const nonce = await this.blockchain.getAsset(assetId).getUserNonce(from);
    const { rollupContractAddress, chainId, assets } = this.getLocalStatus();
    const asset = assets[assetId];
    return createPermitData(asset.name, from, rollupContractAddress, value, nonce, deadline, chainId, asset.address);
  }

  public async createPermitArgs(
    assetId: AssetId,
    from: EthAddress,
    value: bigint,
    deadline?: bigint,
    provider?: EthereumProvider,
  ) {
    if (!deadline) {
      const currentTimeInt = Math.floor(new Date().getTime() / 1000);
      const expireIn = BigInt(300);
      deadline = BigInt(currentTimeInt) + expireIn;
    }
    const permitData = await this.createPermitData(assetId, from, value, deadline);
    const ethSigner = provider ? new Web3Signer(provider) : this.ethSigner;
    const signature = await ethSigner.signTypedData(permitData, from);
    const permitArgs: PermitArgs = { approvalAmount: value, deadline, signature };
    return permitArgs;
  }

  public async createDepositProof(
    assetId: AssetId,
    from: EthAddress,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    to = userId,
    allowChain = true,
  ) {
    const [recipientPrivateOutput, senderPrivateOutput] = to.equals(userId) ? [BigInt(0), value] : [value, BigInt(0)];
    return this.createJoinSplitProof(
      assetId,
      userId,
      value + fee, // publicInput
      BigInt(0), // publicOutput
      BigInt(0), // privateInput
      recipientPrivateOutput,
      senderPrivateOutput,
      signer,
      to, // noteRecipient
      from, // publicOwner
      allowChain,
    );
  }

  public async createWithdrawProof(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    to: EthAddress,
    allowChain = true,
  ) {
    return this.createJoinSplitProof(
      assetId,
      userId,
      BigInt(0),
      value,
      value + fee,
      BigInt(0),
      BigInt(0),
      signer,
      undefined,
      to,
      allowChain,
    );
  }

  public async createTransferProof(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    fee: bigint,
    signer: Signer,
    to: AccountId,
    allowChain = true,
  ) {
    return this.createJoinSplitProof(
      assetId,
      userId,
      BigInt(0),
      BigInt(0),
      value + fee,
      value,
      BigInt(0),
      signer,
      to,
      undefined,
      allowChain,
    );
  }

  public async createJoinSplitProof(
    assetId: AssetId,
    userId: AccountId,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    signer: Signer,
    noteRecipient?: AccountId,
    publicOwner?: EthAddress,
    allowChain = true,
  ) {
    if (privateInput) {
      await this.checkNoteBalance(assetId, userId, privateInput);
    }

    return this.core.createJoinSplitProof(
      assetId,
      userId,
      publicInput,
      publicOutput,
      privateInput,
      recipientPrivateOutput,
      senderPrivateOutput,
      signer,
      noteRecipient,
      publicOwner,
      allowChain,
    );
  }

  public async createDefiProof(
    bridgeId: BridgeId,
    userId: AccountId,
    depositValue: bigint,
    txFee: bigint,
    signer: Signer,
    allowChain = false,
  ) {
    if (!depositValue) {
      throw new Error('Deposit value must be greater than 0.');
    }

    await this.checkNoteBalance(bridgeId.inputAssetId, userId, depositValue + txFee);
    return this.core.createDefiProof(bridgeId, userId, depositValue, txFee, signer, allowChain);
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

  public async createAccount(
    userId: AccountId,
    alias: string,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ) {
    const user = this.getUserData(userId);
    if (user.nonce > 0) {
      throw new Error('User already registered.');
    }

    if (!(await this.isAliasAvailable(alias))) {
      throw new Error('Alias already registered.');
    }

    const signer = this.core.createSchnorrSigner(user.privateKey);
    const aliasHash = this.core.computeAliasHash(alias);

    return this.sendAccountProof(user.id, signer, aliasHash, 0, true, newSigningPublicKey, recoveryPublicKey);
  }

  public async recoverAccount(recoveryPayload: RecoveryPayload) {
    const { trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData } = recoveryPayload;
    const { accountId, signature } = recoveryData;
    const recoverySigner = new RecoverSignatureSigner(recoveryPublicKey, signature);
    return this.addSigningKeys(accountId, recoverySigner, trustedThirdPartyPublicKey);
  }

  public async migrateAccount(
    userId: AccountId,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    const user = this.getUserData(userId);
    if (!user.aliasHash) {
      throw new Error('User not registered.');
    }

    return this.sendAccountProof(
      user.id,
      signer,
      user.aliasHash,
      user.nonce,
      true,
      newSigningPublicKey,
      recoveryPublicKey,
      newAccountPrivateKey,
    );
  }

  public async addSigningKeys(
    userId: AccountId,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
  ) {
    const user = this.getUserData(userId);
    if (!user.aliasHash) {
      throw new Error('User not registered.');
    }

    return this.sendAccountProof(
      user.id,
      signer,
      user.aliasHash,
      user.nonce,
      false,
      signingPublicKey1,
      signingPublicKey2,
    );
  }

  public async createAccountProof(
    userId: AccountId,
    signer: Signer,
    alias: string,
    nonce: number,
    migrate: boolean,
    newSigningPublicKey1?: GrumpkinAddress,
    newSigningPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    const aliasHash = this.core.computeAliasHash(alias);
    return this.core.createAccountProof(
      userId,
      signer,
      aliasHash,
      nonce,
      migrate,
      newSigningPublicKey1,
      newSigningPublicKey2,
      newAccountPrivateKey,
    );
  }

  public async approveProof(address: EthAddress, signingData: Buffer, provider?: EthereumProvider) {
    return this.blockchain.approveProof(address, signingData, provider);
  }

  public async depositFundsToContract(
    assetId: AssetId,
    from: EthAddress,
    value: bigint,
    proofHash?: Buffer,
    permitArgs?: PermitArgs,
    provider?: EthereumProvider,
  ) {
    return this.blockchain.depositPendingFunds(assetId, value, from, proofHash, permitArgs, provider);
  }

  public async getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async isContract(address: EthAddress) {
    return this.blockchain.isContract(address);
  }

  public async isProofApproved(account: EthAddress, txId: Buffer) {
    return !!(await this.blockchain.getUserProofApprovalStatus(account, txId));
  }

  public validateSignature(publicOwner: EthAddress, signature: Buffer, signingData: Buffer) {
    return validateSignature(publicOwner, signature, signingData);
  }

  public async signProof(proofOutput: ProofOutput, inputOwner: EthAddress, provider?: EthereumProvider) {
    const { txHash } = proofOutput.tx;
    const ethSigner = provider ? new Web3Signer(provider) : this.ethSigner;
    return await ethSigner.signMessage(
      Buffer.concat([
        Buffer.from('Signing this message will allow your pending funds to be spent in Aztec transaction:\n'),
        txHash.toBuffer(),
        Buffer.from('\nIMPORTANT: Only sign the message if you trust the client'),
      ]),
      inputOwner,
    );
  }

  public async sendProof(proofOutput: ProofOutput, signature?: Buffer) {
    return this.core.sendProof(proofOutput, signature);
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

  public async getPublicAllowance(assetId: AssetId, ethAddress: EthAddress) {
    const { rollupContractAddress } = this.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(ethAddress, rollupContractAddress);
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

  public async getJoinSplitTxs(userId: AccountId) {
    return this.core.getJoinSplitTxs(userId);
  }

  public async getAccountTxs(userId: AccountId) {
    return this.core.getAccountTxs(userId);
  }

  public async getDefiTxs(userId: AccountId) {
    return this.core.getDefiTxs(userId);
  }

  public async getRemoteUnsettledAccountTxs() {
    return this.core.getRemoteUnsettledAccountTxs();
  }

  public async getRemoteUnsettledJoinSplitTxs() {
    return this.core.getRemoteUnsettledJoinSplitTxs();
  }

  private async checkNoteBalance(assetId: AssetId, userId: AccountId, value: bigint) {
    const maxTxValue = await this.core.getMaxSpendableValue(assetId, userId);
    if (value > maxTxValue) {
      const messages = [`Failed to find 2 notes that sum to ${this.fromBaseUnits(assetId, value)}.`];
      if (maxTxValue) {
        messages.push(`Please make a transaction no more than ${this.fromBaseUnits(assetId, maxTxValue)}.`);
      }
      throw new Error(messages.join(' '));
    }
  }

  private async sendAccountProof(
    userId: AccountId,
    signer: Signer,
    aliasHash: AliasHash,
    nonce: number,
    migrate: boolean,
    newSigningPublicKey1?: GrumpkinAddress,
    newSigningPublicKey2?: GrumpkinAddress,
    newAccountPrivateKey?: Buffer,
  ) {
    const proofOutput = await this.core.createAccountProof(
      userId,
      signer,
      aliasHash,
      nonce,
      migrate,
      newSigningPublicKey1,
      newSigningPublicKey2,
      newAccountPrivateKey,
    );

    let newUser;
    const { tx } = proofOutput;
    if (tx.migrated) {
      const { privateKey } = this.getUserData(userId);
      newUser = await this.core.addUser(newAccountPrivateKey || privateKey, tx.userId.nonce);
    }

    try {
      const txId = await this.sendProof(proofOutput);
      return txId;
    } catch (e) {
      if (newUser) {
        await this.removeUser(newUser.id);
      }
      throw e;
    }
  }
}
