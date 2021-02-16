import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId } from 'barretenberg/asset';
import { Rollup, Tx } from 'barretenberg/rollup_provider';
import { getBlockchainStatus } from 'barretenberg/service';
import { PermitArgs } from 'barretenberg/blockchain';
import { EthereumBlockchain } from 'blockchain/ethereum_blockchain';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { JoinSplitTxOptions } from './tx_options';
import { EthereumProvider } from 'blockchain';
import { Action, ActionState, SdkEvent, SdkInitState } from '../sdk';
import { RecoverSignatureSigner, Signer } from '../signer';
import { RecoveryData, RecoveryPayload, AccountId } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';
import { createPermitData } from './create_permit_data';
import { TxHash } from 'barretenberg/tx_hash';
import { AccountProofOutput, JoinSplitProofOutput } from '../proofs/proof_output';

export * from './wallet_sdk_user';
export * from './wallet_sdk_user_asset';
export * from './create_permit_data';
export * from './tx_options';

const debug = createDebug('bb:wallet_sdk');

export async function createWalletSdk(
  ethereumProvider: EthereumProvider,
  serverUrl: string,
  sdkOptions: SdkOptions = {},
) {
  const { minConfirmation, minConfirmationEHW } = sdkOptions;
  const { rollupContractAddress, chainId } = await getBlockchainStatus(serverUrl);

  const config = {
    console: false,
    gasLimit: 7000000,
    minConfirmation,
    minConfirmationEHW,
  };
  const blockchain = await EthereumBlockchain.new(config, rollupContractAddress, ethereumProvider);

  const core = await createSdk(serverUrl, sdkOptions, blockchain);

  // Set erase flag if requested or contract changed.
  if (sdkOptions.clearDb || !(await core.getRollupContractAddress())?.equals(rollupContractAddress)) {
    debug('erasing database');
    await core.eraseDb();
  }

  const provider = new Web3Provider(ethereumProvider);
  const { chainId: providerChainId } = await provider.getNetwork();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }

  return new WalletSdk(core, blockchain);
}

export interface WalletSdk {
  on(event: SdkEvent.LOG, listener: (msg: string) => void): this;
  on(event: SdkEvent.UPDATED_ACTION_STATE, listener: (actionState: ActionState) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_ROLLUPS, listener: (rollups: Rollup[]) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_TXS, listener: (txs: Tx[]) => void): this;
  on(event: SdkEvent.UPDATED_INIT_STATE, listener: (initState: SdkInitState, message?: string) => void): this;
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: AccountId) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
}

export class WalletSdk extends EventEmitter {
  private actionState?: ActionState;

  constructor(private core: CoreSdk, private blockchain: EthereumBlockchain) {
    super();
  }

  public static create(
    ethereumProvider: EthereumProvider,
    serverUrl: string,
    sdkOptions: SdkOptions = {},
  ) {
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

  public isBusy() {
    return this.actionState ? !this.actionState.txHash && !this.actionState.error : false;
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

  public isEscapeHatchMode() {
    return this.core.isEscapeHatchMode();
  }

  public getLocalStatus() {
    return this.core.getLocalStatus();
  }

  public async getRemoteStatus() {
    return this.core.getRemoteStatus();
  }

  public async getFee(assetId: AssetId) {
    return this.core.getFee(assetId);
  }

  public getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public async getAddressFromAlias(alias: string, nonce?: number) {
    return this.core.getAddressFromAlias(alias, nonce);
  }

  public async getLatestUserNonce(publicKey: GrumpkinAddress) {
    return this.core.getLatestUserNonce(publicKey);
  }

  public async isAliasAvailable(alias: string) {
    return this.core.isAliasAvailable(alias);
  }

  public getActionState(userId?: AccountId) {
    return !userId || this.actionState?.sender.equals(userId) ? this.actionState : undefined;
  }

  public async approve(assetId: AssetId, userId: AccountId, value: bigint, account: EthAddress) {
    const txHash = await this.performAction(Action.APPROVE, userId, async () =>
      this.blockchain.getAsset(assetId).approve(value, account, this.getLocalStatus().rollupContractAddress),
    );
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async createPermitArgs(assetId: AssetId, from: EthAddress, value: bigint, deadline?: bigint) {
    if (!deadline) {
      const currentTimeInt = Math.floor(new Date().getTime() / 1000);
      const expireIn = BigInt(300);
      deadline = BigInt(currentTimeInt) + expireIn;
    }

    const nonce = await this.blockchain.getAsset(assetId).getUserNonce(from);
    const { rollupContractAddress, chainId, assets } = this.getLocalStatus();
    const asset = assets[assetId];
    const permitData = createPermitData(
      asset.name,
      from,
      rollupContractAddress,
      value,
      nonce,
      deadline,
      chainId,
      asset.address,
    );

    const signature = await this.blockchain.signTypedData(permitData, from);
    const permitArgs: PermitArgs = { approvalAmount: value, deadline, signature };
    return permitArgs;
  }

  public async mint(assetId: AssetId, userId: AccountId, value: bigint, account: EthAddress) {
    const txHash = await this.performAction(Action.MINT, userId, async () =>
      this.blockchain.getAsset(assetId).mint(value, account),
    );
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  async deposit(assetId: AssetId, from: EthAddress, to: AccountId, value: bigint, fee: bigint, signer: Signer) {
    const options: JoinSplitTxOptions = { inputOwner: from };
    const publicInput = value + fee;

    if (assetId !== AssetId.ETH) {
      const userPendingDeposit = await this.getUserPendingDeposit(assetId, from);
      const amountToTransfer = publicInput - userPendingDeposit;
      const { rollupContractAddress } = this.getLocalStatus();
      const asset = this.blockchain.getAsset(assetId);
      const existingAllowance = await asset.allowance(from, rollupContractAddress);
      const approvalAmount = amountToTransfer - existingAllowance;

      if (approvalAmount > 0) {
        if (asset.getStaticInfo().permitSupport) {
          options.permitArgs = await this.createPermitArgs(assetId, from, approvalAmount);
        } else {
          this.emit(SdkEvent.LOG, 'Approving deposit...');
          await this.approve(assetId, to, approvalAmount, from);
        }
      }
    }

    return this.joinSplit(assetId, to, publicInput, BigInt(0), BigInt(0), BigInt(0), value, signer, options);
  }

  async withdraw(assetId: AssetId, userId: AccountId, value: bigint, fee: bigint, signer: Signer, to: EthAddress) {
    return this.joinSplit(assetId, userId, BigInt(0), value, value + fee, BigInt(0), BigInt(0), signer, {
      outputOwner: to,
    });
  }

  async transfer(assetId: AssetId, userId: AccountId, value: bigint, fee: bigint, signer: Signer, to: AccountId) {
    return this.joinSplit(assetId, userId, BigInt(0), BigInt(0), value + fee, value, BigInt(0), signer, {
      outputNoteOwner: to,
    });
  }

  public async joinSplit(
    assetId: AssetId,
    userId: AccountId,
    publicInput: bigint,
    publicOutput: bigint,
    privateInput: bigint,
    recipientPrivateOutput: bigint,
    senderPrivateOutput: bigint,
    signer: Signer,
    options: JoinSplitTxOptions = {},
  ) {
    return this.performAction(Action.JOIN_SPLIT, userId, async () => {
      const { permitArgs, inputOwner, outputOwner, outputNoteOwner } = options;

      if (publicOutput + recipientPrivateOutput + senderPrivateOutput > publicInput + privateInput) {
        throw new Error('Total output cannot be larger than total input.');
      }

      if (privateInput) {
        await this.checkNoteBalance(assetId, userId, privateInput);
      }

      if (publicOutput && !outputOwner) {
        throw new Error('No output address specified.');
      }

      if (publicInput) {
        if (!inputOwner) {
          throw new Error('No input address specified.');
        }

        await this.checkPublicBalanceAndApproval(assetId, publicInput, inputOwner, permitArgs);
        const pendingDeposit = await this.getUserPendingDeposit(assetId, inputOwner);
        if (pendingDeposit < publicInput) {
          await this.depositFundsToContract(assetId, inputOwner, publicInput - pendingDeposit, permitArgs);
        }
      }

      return this.core.sendJoinSplitProof(
        assetId,
        userId,
        publicInput,
        publicOutput,
        privateInput,
        recipientPrivateOutput,
        senderPrivateOutput,
        signer,
        outputNoteOwner || userId,
        inputOwner,
        outputOwner,
      );
    });
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
    inputOwner?: EthAddress,
    outputOwner?: EthAddress,
  ) {
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
      inputOwner,
      outputOwner,
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

  public async sendProof(proofOutput: JoinSplitProofOutput | AccountProofOutput) {
    return this.core.sendProof(proofOutput);
  }

  public async depositFundsToContract(assetId: AssetId, from: EthAddress, value: bigint, permitArgs?: PermitArgs) {
    const depositTxHash = await this.blockchain.depositPendingFunds(assetId, value, from, permitArgs);
    return this.blockchain.getTransactionReceipt(depositTxHash);
  }

  private async checkPublicBalanceAndApproval(
    assetId: AssetId,
    value: bigint,
    from: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    const asset = this.blockchain.getAsset(assetId);
    const assetBalance = await asset.balanceOf(from);
    const pendingBalance = await this.blockchain.getUserPendingDeposit(assetId, from);
    if (assetBalance + pendingBalance < value) {
      throw new Error(`Insufficient ${asset.getStaticInfo().symbol} balance: ${assetBalance}.`);
    }

    if (assetId === AssetId.ETH) {
      return;
    }

    if (permitArgs) {
      if (!asset.getStaticInfo().permitSupport) {
        throw new Error(`Asset does not support permit.`);
      }
    } else {
      const allowance = await asset.allowance(from, this.getLocalStatus().rollupContractAddress);
      if (allowance < value) {
        throw new Error(`Insufficient allowance: ${asset.fromBaseUnits(allowance)}`);
      }
    }
  }

  private async checkNoteBalance(assetId: AssetId, userId: AccountId, value: bigint) {
    const balance = this.core.getBalance(assetId, userId);
    if (value > balance) {
      throw new Error('Not enough balance.');
    }

    const maxTxValue = await this.core.getMaxSpendableValue(assetId, userId);
    if (value > maxTxValue) {
      const messages = [`Failed to find 2 notes that sum to ${this.fromBaseUnits(assetId, value)}.`];
      if (maxTxValue) {
        messages.push(`Please make a transaction no more than ${this.fromBaseUnits(assetId, maxTxValue)}.`);
      } else {
        messages.push('Please wait for pending transactions to settle.');
      }
      throw new Error(messages.join(' '));
    }
  }

  public async generateAccountRecoveryData(
    alias: string,
    publicKey: GrumpkinAddress,
    trustedThirdPartyPublicKeys: GrumpkinAddress[],
    nonce?: number,
  ) {
    const accountNonce = nonce !== undefined ? nonce : (await this.core.getLatestUserNonce(publicKey)) + 1;
    const accountId = new AccountId(publicKey, accountNonce);
    const socialRecoverySigner = this.core.createSchnorrSigner(randomBytes(32));
    const recoveryPublicKey = socialRecoverySigner.getPublicKey();

    return Promise.all(
      trustedThirdPartyPublicKeys.map(async trustedThirdPartyPublicKey => {
        const { signature } = await this.core.createAccountTx(
          socialRecoverySigner,
          alias,
          accountNonce,
          false,
          publicKey,
          undefined,
          trustedThirdPartyPublicKey,
        );
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
    return this.performAction(Action.ACCOUNT, userId, async () => {
      const user = this.getUserData(userId);
      if (user.nonce > 0) {
        throw new Error('User already registered.');
      }

      if (!(await this.isAliasAvailable(alias))) {
        throw new Error('Alias already registered.');
      }

      const signer = this.core.createSchnorrSigner(user.privateKey);
      const aliasHash = this.core.computeAliasHash(alias);

      return this.core.sendAccountProof(user.id, signer, aliasHash, 0, true, newSigningPublicKey, recoveryPublicKey);
    });
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
    return this.performAction(Action.ACCOUNT, userId, async () => {
      const user = this.getUserData(userId);
      if (!user.aliasHash) {
        throw new Error('User not registered.');
      }

      return this.core.sendAccountProof(
        user.id,
        signer,
        user.aliasHash,
        user.nonce,
        true,
        newSigningPublicKey,
        recoveryPublicKey,
        newAccountPrivateKey,
      );
    });
  }

  public async addSigningKeys(
    userId: AccountId,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
  ) {
    return this.performAction(Action.ACCOUNT, userId, async () => {
      const user = this.getUserData(userId);
      if (!user.aliasHash) {
        throw new Error('User not registered.');
      }

      return this.core.sendAccountProof(
        user.id,
        signer,
        user.aliasHash,
        user.nonce,
        false,
        signingPublicKey1,
        signingPublicKey2,
      );
    });
  }

  public async getSigningKeys(userId: AccountId) {
    return this.core.getSigningKeys(userId);
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

  public async addUser(privateKey: Buffer, nonce?: number) {
    const userData = await this.core.addUser(privateKey, nonce);
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

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    return this.blockchain.getAsset(assetId).balanceOf(ethAddress);
  }

  public async getPublicAllowance(assetId: AssetId, ethAddress: EthAddress) {
    const { rollupContractAddress } = this.getLocalStatus();
    return this.blockchain.getAsset(assetId).allowance(ethAddress, rollupContractAddress);
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

  public async getJoinSplitTxs(userId: AccountId) {
    return this.core.getJoinSplitTxs(userId);
  }

  public async getAccountTxs(userId: AccountId) {
    return this.core.getAccountTxs(userId);
  }

  public async getNotes(userId: AccountId) {
    return this.core.getNotes(userId);
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.core.derivePublicKey(privateKey);
  }

  /**
   * Returns a globally resolved AccountId.
   */
  public async getAccountId(aliasOrAddress: string | GrumpkinAddress, nonce?: number) {
    return this.core.getAccountId(aliasOrAddress, nonce);
  }

  private async performAction(action: Action, userId: AccountId, fn: () => Promise<TxHash>) {
    if (this.isBusy()) {
      throw new Error('WalletSdk is busy performing another action.');
    }

    this.actionState = {
      action,
      sender: userId,
      created: new Date(),
    };
    this.emit(SdkEvent.UPDATED_ACTION_STATE, { ...this.actionState });
    try {
      this.actionState.txHash = await fn();
    } catch (err) {
      this.actionState.error = err;
      throw err;
    } finally {
      this.emit(SdkEvent.UPDATED_ACTION_STATE, { ...this.actionState });
    }
    return this.actionState.txHash;
  }
}
