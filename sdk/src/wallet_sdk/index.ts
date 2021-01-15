import { Web3Provider } from '@ethersproject/providers';
import { EthAddress, GrumpkinAddress } from 'barretenberg/address';
import { AssetId, ProofId } from 'barretenberg/client_proofs';
import { getProviderStatus, Rollup, Tx, TxHash } from 'barretenberg/rollup_provider';
import { PermitArgs } from 'blockchain';
import { EthereumBlockchain } from 'blockchain/ethereum_blockchain';
import { randomBytes } from 'crypto';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { CoreSdk } from '../core_sdk/core_sdk';
import { createSdk, SdkOptions } from '../core_sdk/create_sdk';
import { JoinSplitTxOptions } from './tx_options';
import { EthereumProvider } from 'blockchain';
import { Action, ActionState, SdkEvent, SdkInitState } from '../sdk';
import { EthereumSigner, RecoverSignatureSigner, Signer } from '../signer';
import { MockTokenContract, TokenContract, Web3TokenContract } from '../token_contract';
import { RecoveryData, RecoveryPayload, AccountId, AccountAliasId } from '../user';
import { WalletSdkUser } from './wallet_sdk_user';

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
  on(event: SdkEvent.UPDATED_USER_STATE, listener: (userId: AccountId) => void): this;
  on(event: SdkEvent.UPDATED_WORLD_STATE, listener: (rollupId: number, latestRollupId: number) => void): this;
}

export class WalletSdk extends EventEmitter {
  private actionState?: ActionState;

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
    return this.actionState ? !this.actionState.txHash && !this.actionState.error : false;
  }

  public async awaitSynchronised() {
    return this.core.awaitSynchronised();
  }

  public async awaitUserSynchronised(userId: AccountId) {
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
    // assetId 0 is eth.
    return this.tokenContracts[assetId - 1];
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

  public isUserAdded(userId: AccountId) {
    try {
      this.getUserData(userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  public getAssetPermitSupport(assetId) {
    return this.blockchain.getAssetPermitSupport(assetId);
  }

  public getActionState(userId?: AccountId) {
    return !userId || this.actionState?.sender.equals(userId) ? this.actionState : undefined;
  }

  public async approve(assetId: AssetId, userId: AccountId, value: bigint, account: EthAddress) {
    const action = () => this.getTokenContract(assetId).approve(value, account);
    const txHash = await this.performAction(Action.APPROVE, value, userId, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async mint(assetId: AssetId, userId: AccountId, value: bigint, account: EthAddress) {
    const action = () => this.getTokenContract(assetId).mint(value, account);
    const txHash = await this.performAction(Action.MINT, value, userId, action);
    this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    return txHash;
  }

  public async deposit(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    signer: Signer,
    ethSigner: EthereumSigner,
    permitArgs?: PermitArgs,
    to?: AccountId,
    options?: JoinSplitTxOptions,
  ) {
    const recipient = to || userId;
    const { publicTxFee, privateTxFee } = await this.getTxFeeFromOptions(options);
    const publicInput = value + publicTxFee;
    const privateInput = privateTxFee;

    const action = async () => {
      await this.depositFundsToContract(assetId, userId, ethSigner.getAddress(), publicInput, permitArgs);

      this.emit(SdkEvent.LOG, 'Creating deposit proof...');
      return this.core.createProof(
        assetId,
        userId,
        'DEPOSIT',
        value,
        signer,
        ethSigner,
        recipient,
        undefined,
        publicTxFee,
        privateTxFee,
      );
    };

    const validation = async () => {
      if (publicTxFee && assetId !== AssetId.ETH) {
        throw new Error('Fee is currently only payable in ETH.');
      }

      if (options?.feePayer && options.feePayer.getAddress() !== ethSigner.getAddress()) {
        throw new Error('Fee payer must be the depositor.');
      }

      const isPermit = !!permitArgs;
      await this.checkPublicBalanceAndApproval(assetId, publicInput, ethSigner.getAddress(), isPermit);

      if (privateInput) {
        await this.checkNoteBalance(assetId, userId, privateInput);
      }
    };

    return this.performAction(Action.DEPOSIT, value, userId, action, validation);
  }

  public async withdraw(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    signer: Signer,
    to: EthAddress,
    options?: JoinSplitTxOptions,
  ) {
    const { publicTxFee, privateTxFee } = await this.getTxFeeFromOptions(options);
    const { feePayer, permitArgs } = options || {};
    const publicInput = publicTxFee;
    const privateInput = value + privateTxFee;

    const action = async () => {
      if (publicInput) {
        await this.depositFundsToContract(assetId, userId, feePayer!.getAddress(), publicInput, permitArgs);
      }

      return this.core.createProof(
        assetId,
        userId,
        'WITHDRAW',
        value,
        signer,
        feePayer,
        undefined,
        to,
        publicTxFee,
        privateTxFee,
      );
    };

    const validation = async () => {
      await this.checkNoteBalance(assetId, userId, privateInput);

      if (publicInput) {
        if (assetId !== AssetId.ETH) {
          throw new Error('Fee is currently only payable in ETH.');
        }

        if (!feePayer) {
          throw new Error('Fee payer not specified.');
        }

        await this.checkPublicBalanceAndApproval(assetId, publicInput, feePayer.getAddress(), false);
      }
    };

    return this.performAction(Action.WITHDRAW, value, userId, action, validation);
  }

  public async transfer(
    assetId: AssetId,
    userId: AccountId,
    value: bigint,
    signer: Signer,
    to: AccountId,
    options?: JoinSplitTxOptions,
  ) {
    const { publicTxFee, privateTxFee } = await this.getTxFeeFromOptions(options);
    const { feePayer, permitArgs } = options || {};
    const publicInput = publicTxFee;
    const privateInput = value + privateTxFee;

    const action = async () => {
      if (publicInput) {
        await this.depositFundsToContract(assetId, userId, feePayer!.getAddress(), publicInput, permitArgs);
      }

      return this.core.createProof(
        assetId,
        userId,
        'TRANSFER',
        value,
        signer,
        feePayer,
        to,
        undefined,
        publicTxFee,
        privateTxFee,
      );
    };

    const validation = async () => {
      await this.checkNoteBalance(assetId, userId, privateInput);

      if (publicInput) {
        if (assetId !== AssetId.ETH) {
          throw new Error('Fee is currently only payable in ETH.');
        }

        if (!feePayer) {
          throw new Error('Fee payer not specified.');
        }

        await this.checkPublicBalanceAndApproval(assetId, publicInput, feePayer.getAddress(), false);
      }
    };

    return this.performAction(Action.TRANSFER, value, userId, action, validation);
  }

  private async depositFundsToContract(
    assetId: AssetId,
    userId: AccountId,
    from: EthAddress,
    value: bigint,
    permitArgs?: PermitArgs,
  ) {
    const userPendingDeposit = await this.getUserPendingDeposit(assetId, from);
    if (userPendingDeposit < value) {
      this.emit(SdkEvent.LOG, 'Depositing funds to contract...');
      const depositTxHash = await this.blockchain.depositPendingFunds(assetId, value, from, permitArgs);
      await this.blockchain.getTransactionReceipt(depositTxHash);
      this.emit(SdkEvent.UPDATED_USER_STATE, userId);
    }
  }

  private async getTxFeeFromOptions(options?: JoinSplitTxOptions) {
    const { txFee, payTxFeeByPrivateAsset } = options || {};
    const { fees } = await this.getRemoteStatus();
    const assetFees = fees.get(AssetId.ETH);
    const fee = txFee !== undefined ? txFee : (assetFees && assetFees.get(ProofId.JOIN_SPLIT)) || BigInt(0);
    const [publicTxFee, privateTxFee] = payTxFeeByPrivateAsset ? [BigInt(0), fee] : [fee, BigInt(0)];
    return {
      publicTxFee,
      privateTxFee,
    };
  }

  private async checkPublicBalanceAndApproval(assetId: AssetId, value: bigint, from: EthAddress, isPermit: boolean) {
    if (assetId === AssetId.ETH) {
      const ethBalance = await this.blockchain.getEthBalance(from);
      if (ethBalance < value) {
        throw new Error(`Insufficient eth balance: ${ethBalance}.`);
      }
    } else {
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
  }

  private async checkNoteBalance(assetId: AssetId, userId: AccountId, value: bigint) {
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
    const aliasHash = this.core.computeAliasHash(alias);
    const accountNonce = nonce !== undefined ? nonce : (await this.core.getLatestUserNonce(publicKey)) + 1;
    const accountAliasId = new AccountAliasId(aliasHash, accountNonce);
    const socialRecoverySigner = this.core.createSchnorrSigner(randomBytes(32));
    const recoveryPublicKey = socialRecoverySigner.getPublicKey();

    return Promise.all(
      trustedThirdPartyPublicKeys.map(async trustedThirdPartyPublicKey => {
        const { signature } = await this.core.createAccountTx(
          socialRecoverySigner,
          aliasHash,
          accountNonce,
          false,
          publicKey,
          undefined,
          trustedThirdPartyPublicKey,
        );
        const recoveryData = new RecoveryData(accountAliasId, signature);
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

    const action = async () => {
      const signer = this.core.createSchnorrSigner(user.privateKey);
      const aliasHash = this.core.computeAliasHash(alias);

      return this.core.createAccountProof(
        user.id,
        signer,
        aliasHash,
        0,
        true,
        undefined,
        newSigningPublicKey,
        recoveryPublicKey,
      );
    };

    return this.performAction(Action.ACCOUNT, BigInt(0), userId, action);
  }

  public async recoverAccount(recoveryPayload: RecoveryPayload) {
    const { trustedThirdPartyPublicKey, recoveryPublicKey, recoveryData } = recoveryPayload;
    const { accountAliasId, signature } = recoveryData;
    const publicKey = await this.core.getAddressFromAliasHash(accountAliasId.aliasHash, accountAliasId.nonce);
    if (!publicKey) {
      throw new Error(`User not found.`);
    }

    const userId = this.getUserId(publicKey, accountAliasId.nonce);
    const recoverySigner = new RecoverSignatureSigner(recoveryPublicKey, signature);

    return this.addSigningKeys(userId, recoverySigner, trustedThirdPartyPublicKey);
  }

  public async migrateAccount(
    userId: AccountId,
    signer: Signer,
    newSigningPublicKey: GrumpkinAddress,
    recoveryPublicKey?: GrumpkinAddress,
    newAccountPublicKey?: GrumpkinAddress,
  ) {
    const user = this.getUserData(userId);
    if (!user.aliasHash) {
      throw new Error('User not registered.');
    }

    const action = async () => {
      return this.core.createAccountProof(
        user.id,
        signer,
        user.aliasHash!,
        user.nonce,
        true,
        newAccountPublicKey,
        newSigningPublicKey,
        recoveryPublicKey,
      );
    };

    return this.performAction(Action.ACCOUNT, BigInt(0), userId, action);
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

    const action = async () => {
      return this.core.createAccountProof(
        user.id,
        signer,
        user.aliasHash!,
        user.nonce,
        false,
        undefined,
        signingPublicKey1,
        signingPublicKey2,
      );
    };

    return this.performAction(Action.ACCOUNT, BigInt(0), userId, action);
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

  public getUser(userId: AccountId) {
    const userData = this.getUserData(userId);
    return new WalletSdkUser(userData.id, this);
  }

  public getBalance(assetId: AssetId, userId: AccountId) {
    return this.core.getBalance(assetId, userId);
  }

  public async getPublicBalance(assetId: AssetId, ethAddress: EthAddress) {
    if (assetId === AssetId.ETH) {
      return this.blockchain.getEthBalance(ethAddress);
    }

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

  public async getTx(txHash: TxHash) {
    return this.core.getTx(txHash);
  }

  public async getUserTxs(userId: AccountId) {
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
    const userData = this.core
      .getUsersData()
      .filter(u => u.publicKey.equals(publicKey) && (nonce === undefined || u.nonce === nonce))
      .sort((a, b) => (a.nonce > b.nonce ? -1 : 1))[0];
    if (!userData) {
      throw new Error(`User not found: ${publicKey}${nonce !== undefined ? ` (${nonce})` : ''}`);
    }

    return new AccountId(publicKey, userData.nonce);
  }

  public async getAccountId(user: string | GrumpkinAddress, nonce?: number) {
    return this.core.getAccountId(user, nonce);
  }

  private async performAction(
    action: Action,
    value: bigint,
    userId: AccountId,
    fn: () => Promise<TxHash>,
    validation = async () => {},
  ) {
    this.actionState = {
      action,
      value,
      sender: userId,
      created: new Date(),
    };
    this.emit(SdkEvent.UPDATED_ACTION_STATE, { ...this.actionState });
    try {
      await validation();
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
