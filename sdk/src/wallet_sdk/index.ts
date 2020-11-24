import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { getProviderStatus, Rollup, Tx, TxHash } from 'barretenberg/rollup_provider';
import { PermitArgs } from 'blockchain';
import { EthereumBlockchain } from 'blockchain/ethereum_blockchain';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { EthereumProvider } from 'blockchain';
import { Action, ActionState, AssetId, SdkEvent, SdkInitState } from '../sdk';
import { EthereumSigner, RecoverSignatureSigner, Signer } from '../signer';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { RecoveryData, RecoveryPayload, UserId } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';

export * from './wallet_sdk_user';
export * from './wallet_sdk_user_asset';
export * from './create_permit_data';

const debug = createDebug('bb:wallet_sdk');

export async function createWalletSdk(
  ethereumProvider: EthereumProvider,
  serverUrl: string,
  sdkOptions: SdkOptions = {},
) {
  const status = await getProviderStatus(serverUrl);
  const core = await createSdk(serverUrl, sdkOptions, status, ethereumProvider);
  const { rollupContractAddress, tokenContractAddresses, chainId, networkOrHost } = status;

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

  const tokenContracts: TokenContract[] =
    networkOrHost !== 'development'
      ? tokenContractAddresses.map(a => new Web3TokenContract(provider, a, rollupContractAddress, chainId))
      : [new MockTokenContract()];

  await Promise.all(tokenContracts.map(tc => tc.init()));

  const config = {
    networkOrHost: serverUrl,
    console: false,
    gasLimit: 7000000,
  };
  const blockchain = await EthereumBlockchain.new(config, status.rollupContractAddress, ethereumProvider);

  return new WalletSdk(core, blockchain, tokenContracts);
}

export interface WalletSdk {
  on(event: SdkEvent.UPDATED_ACTION_STATE, listener: (actionState: ActionState) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_ROLLUPS, listener: (rollups: Rollup[]) => void): this;
  on(event: SdkEvent.UPDATED_EXPLORER_TXS, listener: (txs: Tx[]) => void): this;
  on(event: SdkEvent.UPDATED_INIT_STATE, listener: (initState: SdkInitState, message?: string) => void): this;
  on(event: SdkEvent.UPDATED_USERS, listener: () => void): this;
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: UserId) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
}

export class WalletSdk extends EventEmitter {
  constructor(private core: CoreSdk, private blockchain: EthereumBlockchain, private tokenContracts: TokenContract[]) {
    super();
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

  public async clearData() {
    return this.core.clearData();
  }

  public isBusy() {
    return this.core.isBusy();
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitUserSynchronised(userId: UserId) {
    return this.core.awaitUserSynchronised(userId);
  }

  public async awaitSettlement(txHash: TxHash, timeout = 120) {
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

  public getTokenContract(assetId: AssetId) {
    return this.tokenContracts[assetId];
  }

  public getUserPendingDeposit(assetId: AssetId, account: EthAddress) {
    return this.blockchain.getUserPendingDeposit(assetId, account);
  }

  public getUserNonce(assetId: AssetId, account: EthAddress) {
    return this.blockchain.getUserNonce(assetId, account);
  }

  public async getTransactionReceipt(txHash: TxHash) {
    return this.blockchain.getTransactionReceipt(txHash);
  }

  public async getAddressFromAlias(alias: string, nonce?: number) {
    return this.core.getAddressFromAlias(alias, nonce);
  }

  public async getLatestUserNonce(publicKey: GrumpkinAddress) {
    return this.core.getLatestUserNonce(publicKey);
  }

  public async getLatestAliasNonce(alias: string) {
    return this.core.getLatestAliasNonce(alias);
  }

  public async isAliasAvailable(alias: string) {
    return this.core.isAliasAvailable(alias);
  }

  public getAssetPermitSupport(assetId) {
    return this.blockchain.getAssetPermitSupport(assetId);
  }

  public getActionState(userId?: UserId) {
    return this.core.getActionState(userId);
  }

  public async approve(
    assetId: AssetId,
    publicKey: GrumpkinAddress,
    value: bigint,
    account: EthAddress,
  ): Promise<TxHash> {
    const action = () => this.getTokenContract(assetId).approve(value, account);
    const { rollupContractAddress } = this.core.getLocalStatus();
    const userId = this.getUserId(publicKey);
    const txHash = await this.core.performAction(Action.APPROVE, value, userId, rollupContractAddress, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async mint(assetId: AssetId, publicKey: GrumpkinAddress, value: bigint, account: EthAddress): Promise<TxHash> {
    const action = () => this.getTokenContract(assetId).mint(value, account);
    const userId = this.getUserId(publicKey);
    const txHash = await this.core.performAction(Action.MINT, value, userId, account, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async deposit(
    assetId: AssetId,
    publicKey: GrumpkinAddress,
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs?: PermitArgs,
    to?: GrumpkinAddress | string,
    toNonce?: number,
  ): Promise<TxHash> {
    const userId = this.getUserId(publicKey);
    const recipient = !to ? publicKey : typeof to === 'string' ? await this.getAddressFromAlias(to) : to;

    const action = async () => {
      const userPendingDeposit = await this.getUserPendingDeposit(assetId, ethSigner.getAddress());
      if (userPendingDeposit < value) {
        this.emit(SdkEvent.LOG, 'Depositing funds to contract...');
        const depositTxHash = await this.blockchain.depositPendingFunds(
          assetId,
          value,
          ethSigner.getAddress(),
          permitArgs,
        );
        await this.blockchain.getTransactionReceipt(depositTxHash);
        this.emit(SdkEvent.UPDATED_USER_STATE, userId);
      }
      this.emit(SdkEvent.LOG, 'Creating deposit proof...');

      return this.core.createProof(assetId, userId, 'DEPOSIT', value, signer, ethSigner, recipient, toNonce);
    };

    const validation = async () => {
      const isPermit = !!permitArgs;
      await this.checkPublicBalanceAndApproval(assetId, value, ethSigner.getAddress(), isPermit);
      if (!recipient) {
        throw new Error(`No address found for alias: ${to}`);
      }
    };

    return this.core.performAction(Action.DEPOSIT, value, userId, to || recipient!, action, validation);
  }

  public async withdraw(
    assetId: AssetId,
    publicKey: GrumpkinAddress,
    value: bigint,
    signer: Signer,
    to: EthAddress,
    fromNonce?: number,
  ): Promise<TxHash> {
    const userId = this.getUserId(publicKey, fromNonce);
    const action = () =>
      this.core.createProof(assetId, userId, 'WITHDRAW', value, signer, undefined, undefined, undefined, to);
    const validation = async () => {
      await this.checkNoteBalance(publicKey, assetId, value, fromNonce);
    };
    return this.core.performAction(Action.WITHDRAW, value, userId, to, action, validation);
  }

  public async transfer(
    assetId: AssetId,
    publicKey: GrumpkinAddress,
    value: bigint,
    signer: Signer,
    to: GrumpkinAddress | string,
    fromNonce?: number,
    toNonce?: number,
  ): Promise<TxHash> {
    const userId = this.getUserId(publicKey, fromNonce);
    const recipient = typeof to === 'string' ? await this.getAddressFromAlias(to) : to;
    const action = () =>
      this.core.createProof(assetId, userId, 'TRANSFER', value, signer, undefined, recipient, toNonce);
    const validation = async () => {
      await this.checkNoteBalance(publicKey, assetId, value, fromNonce);
    };
    return this.core.performAction(Action.TRANSFER, value, userId, to, action, validation);
  }

  private async checkPublicBalanceAndApproval(assetId: AssetId, value: bigint, from: EthAddress, isPermit: boolean) {
    const tokenContract = this.getTokenContract(assetId);
    const tokenBalance = await tokenContract.balanceOf(from);
    const pendingTokenBalance = await this.blockchain.getUserPendingDeposit(assetId, from);
    if (tokenBalance + pendingTokenBalance < value) {
      throw new Error(`Insufficient public token balance: ${tokenContract.fromErc20Units(tokenBalance)}`);
    }
    if (!isPermit) {
      const allowance = await tokenContract.allowance(from);
      if (allowance < value) {
        throw new Error(`Insufficient allowance: ${tokenContract.fromErc20Units(allowance)}`);
      }
    }
  }

  private async checkNoteBalance(publicKey: GrumpkinAddress, assetId: AssetId, value: bigint, nonce?: number) {
    const userId = this.getUserId(publicKey, nonce);
    const userState = this.core.getUserState(userId);
    if (!userState) {
      throw new Error('User not found.');
    }

    const balance = userState.getBalance(assetId);
    if (value > balance) {
      throw new Error('Not enough balance.');
    }

    const maxTxValue = await userState.getMaxSpendableValue(assetId);
    if (value > maxTxValue) {
      const messages = [`Failed to find 2 notes that sum to ${this.fromErc20Units(assetId, value)}.`];
      if (maxTxValue) {
        messages.push(`Please make a transaction no more than ${this.fromErc20Units(assetId, maxTxValue)}.`);
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
        const recoveryData = new RecoveryData(accountNonce, signature);
        return new RecoveryPayload(trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData);
      }),
    );
  }

  public async createAccount(
    alias: string,
    publicKey: GrumpkinAddress,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
  ): Promise<TxHash> {
    const user = this.getUserData(publicKey);
    if (!user) {
      throw new Error(`User not found: ${publicKey}`);
    }

    if (user.nonce > 0) {
      throw new Error('User already registered.');
    }

    if (!(await this.isAliasAvailable(alias))) {
      throw new Error('Alias already registered.');
    }

    const signer = this.core.createSchnorrSigner(user.privateKey);
    return this.core.createAccountProof(
      user.id,
      signer,
      alias,
      0,
      true,
      undefined,
      newSigningPublicKey,
      recoveryPublicKey,
    );
  }

  public async recoverAccount(alias: string, recoveryPayload: RecoveryPayload): Promise<TxHash> {
    const { trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData } = recoveryPayload;
    const { nonce, signature } = recoveryData;
    const recoverySigner = new RecoverSignatureSigner(recoveryPublicKey, signature);

    return this.addSigningKeys(alias, recoverySigner, trustedThirdPartyPublicKey, undefined, nonce);
  }

  public async migrateAccount(
    alias: string,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
  ): Promise<TxHash> {
    const publicKey = await this.getAddressFromAlias(alias);
    if (!publicKey) {
      throw new Error('Alias not registered.');
    }

    const latestNonce = await this.core.getLatestAliasNonce(alias);
    const user = this.getUserData(publicKey, latestNonce);
    if (!user) {
      throw new Error('User not found');
    }

    return this.core.createAccountProof(
      user.id,
      signer,
      alias,
      user.nonce,
      true,
      newAccountPublicKey,
      newSigningPublicKey,
      recoveryPublicKey,
    );
  }

  public async addSigningKeys(
    alias: string,
    signer: Signer,
    signingPublicKey1: GrumpkinAddress,
    signingPublicKey2?: GrumpkinAddress,
    nonce?: number,
  ): Promise<TxHash> {
    const publicKey = await this.getAddressFromAlias(alias, nonce);
    if (!publicKey) {
      throw new Error('Alias not registered.');
    }

    const user = this.getUserData(publicKey, nonce);
    if (!user) {
      throw new Error('User not found');
    }

    return this.core.createAccountProof(
      user.id,
      signer,
      alias,
      user.nonce,
      false,
      undefined,
      signingPublicKey1,
      signingPublicKey2,
    );
  }

  public async getSigningKeys(alias: string, nonce?: number) {
    return this.core.getSigningKeys(alias, nonce);
  }

  public getUserData(publicKey: GrumpkinAddress, nonce?: number) {
    const userId = this.getUserId(publicKey, nonce);
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

  public async removeUser(publicKey: GrumpkinAddress, nonce?: number) {
    const userId = this.getUserId(publicKey, nonce);
    return this.core.removeUser(userId);
  }

  public getUser(publicKey: GrumpkinAddress, nonce?: number) {
    const userId = this.getUserId(publicKey, nonce);
    return new WalletSdkUser(userId, this);
  }

  public getBalance(assetId: AssetId, publicKey: GrumpkinAddress, nonce?: number) {
    const userId = this.getUserId(publicKey, nonce);
    return this.core.getBalance(assetId, userId);
  }

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    return this.getTokenContract(assetId).balanceOf(ethAddress);
  }

  public async getPublicAllowance(assetId: AssetId, ethAddress: EthAddress) {
    return this.getTokenContract(assetId).allowance(ethAddress);
  }

  public fromErc20Units(assetId: AssetId, value: bigint, precision?: number) {
    return this.getTokenContract(assetId).fromErc20Units(value, precision);
  }

  public toErc20Units(assetId: AssetId, value: string) {
    return this.getTokenContract(assetId).toErc20Units(value);
  }

  public async getLatestRollups(count: number) {
    return this.core.getLatestRollups(count);
  }

  public async getLatestTxs(count: number) {
    return this.core.getLatestTxs(count);
  }

  public async getRollup(rollupId: number) {
    return this.core.getRollup(rollupId);
  }

  public async getTx(txHash: Buffer) {
    return this.core.getTx(txHash);
  }

  public async getUserTxs(userId: UserId) {
    return this.core.getUserTxs(userId);
  }

  public startTrackingGlobalState() {
    return this.core.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    return this.core.stopTrackingGlobalState();
  }

  public derivePublicKey(privateKey: Buffer) {
    return this.core.derivePublicKey(privateKey);
  }

  public getUserId(publicKey: GrumpkinAddress, nonce?: number) {
    if (nonce !== undefined) {
      return new UserId(publicKey, nonce);
    }

    const maxNonce = this.core
      .getUsersData()
      .reduce(
        (maxNonce, user) => (user.publicKey.equals(publicKey) && user.nonce > maxNonce ? user.nonce : maxNonce),
        0,
      );
    return new UserId(publicKey, maxNonce);
  }
}
