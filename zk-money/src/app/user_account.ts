import type { CutdownAsset } from './types';
import { AccountId, AztecSdk, Note, SdkEvent, EthereumProvider } from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { debounce, DebouncedFunc } from 'lodash';
import { AccountForm, AccountFormEvent, MergeForm, MigrateForm, SendForm, SendMode, ShieldForm } from './account_forms';
import { AccountState, AssetState, initialAssetState } from './account_state';
import { AccountAction, parseAccountTx, parseJoinSplitTx } from './account_txs';
import { AccountUtils } from './account_utils';
import { EthAccount, EthAccountEvent } from './eth_account';
import { Form } from './form';
import { KeyVault } from './key_vault';
import { Network } from './networks';
import { PriceFeedService } from './price_feed_service';
import { Provider, ProviderEvent } from './provider';
import { RollupService, RollupServiceEvent, RollupStatus } from './rollup_service';
import {
  isKnownAssetAddressString,
  KNOWN_MAINNET_ASSET_ADDRESS_STRS,
  PerKnownAddress,
} from 'alt-model/known_assets/known_asset_addresses';

const debug = createDebug('zm:account');

const sumNotes = (notes: Note[]) => notes.reduce((sum, note) => sum + note.value, 0n);

export enum UserAccountEvent {
  UPDATED_ACCOUNT_STATE = 'UPDATED_ACCOUNT_STATE',
  UPDATED_ASSET_STATE = 'UPDATED_ASSET_STATE',
  UPDATED_ACCOUNT_ACTION = 'UPDATED_ACCOUNT_ACTION',
  UPDATED_TXS_PUBLISH_TIME = 'UPDATED_TXS_PUBLISH_TIME',
  UPDATED_FORM_DATA = 'UPDATED_FORM_DATA',
}

export interface UserAccount {
  on(event: UserAccountEvent.UPDATED_ACCOUNT_STATE, listener: (state: AccountState) => void): this;
  on(event: UserAccountEvent.UPDATED_ASSET_STATE, listener: (state: AssetState) => void): this;
  on(event: UserAccountEvent.UPDATED_ACCOUNT_ACTION, listener: (action: AccountAction) => void): this;
  on(event: UserAccountEvent.UPDATED_TXS_PUBLISH_TIME, listener: () => void): this;
  on(event: UserAccountEvent.UPDATED_FORM_DATA, listener: () => void): this;
}

export class UserAccount extends EventEmitter {
  private accountState: AccountState;
  private assetState: AssetState;
  private activeAction?: {
    action: AccountAction;
    form: AccountForm;
  };
  private provider?: Provider;
  private ethAccount!: EthAccount;
  private nextPublishTime: Date;

  private debounceRefreshAccountState: DebouncedFunc<() => void>;
  private debounceRefreshAssetState: DebouncedFunc<() => void>;

  private readonly refreshAccountDebounceWait = 100;
  private readonly refreshAssetDebounceWait = 100;

  constructor(
    readonly assets: CutdownAsset[],
    readonly userId: AccountId,
    readonly alias: string,
    readonly latestUserNonce: number,
    private activeAsset: number,
    private readonly keyVault: KeyVault,
    private readonly sdk: AztecSdk,
    private readonly stableEthereumProvider: EthereumProvider,
    private readonly rollup: RollupService,
    private readonly priceFeedService: PriceFeedService,
    private readonly accountUtils: AccountUtils,
    private readonly requiredNetwork: Network,
    private readonly explorerUrl: string,
    private readonly txAmountLimits: PerKnownAddress<bigint>,
    private readonly maxAvailableAssetId: number,
  ) {
    super();
    this.accountState = {
      userId,
      version: keyVault.version,
      alias,
      accountTxs: [],
      settled: false,
      latestUserNonce,
    };
    this.assetState = {
      ...initialAssetState,
      asset: assets[activeAsset],
      txAmountLimit: txAmountLimits[KNOWN_MAINNET_ASSET_ADDRESS_STRS.ETH] || 0n,
    };
    this.nextPublishTime = rollup.nextPublishTime;
    this.debounceRefreshAccountState = debounce(this.refreshAccountState, this.refreshAccountDebounceWait);
    this.debounceRefreshAssetState = debounce(this.refreshAssetState, this.refreshAssetDebounceWait);
  }

  getAccountState() {
    return this.accountState;
  }

  getAssetState() {
    return this.assetState;
  }

  getActiveAction() {
    return this.activeAction
      ? {
          action: this.activeAction.action,
          formValues: this.activeAction.form.getValues(),
        }
      : undefined;
  }

  getMergeForm() {
    return undefined;
  }

  get txsPublishTime() {
    return this.rollup.nextPublishTime;
  }

  isProcessingAction() {
    return !!this.activeAction && this.activeAction.form.processing;
  }

  async init(provider?: Provider) {
    this.sdk.on(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
    this.priceFeedService.subscribe(this.activeAsset, this.onPriceChange);
    await this.changeProvider(provider);
    await this.refreshAccountState();
    await this.refreshAssetState();
  }

  destroy() {
    if (this.isProcessingAction()) {
      throw new Error('Cannot destroy user account while a form is being processed.');
    }

    this.removeAllListeners();
    this.activeAction?.form.destroy();
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.ethAccount?.destroy();
    this.sdk.off(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
    this.priceFeedService.unsubscribe(this.activeAsset, this.onPriceChange);
    this.debounceRefreshAccountState.cancel();
    this.debounceRefreshAssetState.cancel();
  }

  async changeAsset(assetId: number) {
    if (assetId === this.activeAsset) return;

    if (this.activeAction?.form.processing) {
      debug('Cannot change asset while a form is being processed.');
      return;
    }

    this.activeAction?.form.destroy();
    this.activeAction = undefined;

    this.priceFeedService.unsubscribe(this.activeAsset, this.onPriceChange);
    this.activeAsset = assetId;
    this.priceFeedService.subscribe(this.activeAsset, this.onPriceChange);
    await this.renewEthAccount();
    await this.refreshAssetState();
  }

  async changeProvider(provider?: Provider) {
    this.provider?.off(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.provider = provider;
    this.provider?.on(ProviderEvent.UPDATED_PROVIDER_STATE, this.onProviderStateChange);
    this.activeAction?.form.changeProvider(provider);
    await this.renewEthAccount();
  }

  async selectAction(action: AccountAction) {
    if (this.activeAction) {
      debug('Clear previous action before selecting another one.');
      return;
    }

    const form = this.createForm(action);

    for (const e in AccountFormEvent) {
      const event = (AccountFormEvent as any)[e];
      form.on(event, () => this.emit(UserAccountEvent.UPDATED_FORM_DATA));
    }

    this.updateAccountAction({ action, form });

    await form.init();
  }

  clearAction() {
    if (this.activeAction?.form.processing) {
      debug('Cannot clear action while it is being processed.');
      return;
    }

    this.activeAction?.form.destroy();
    this.updateAccountAction();
  }

  changeForm(action: AccountAction, newInputs: Form) {
    if (action !== this.activeAction?.action) {
      debug('Wrong action.');
      return;
    }

    this.activeAction!.form.changeValues(newInputs);
  }

  async validateForm(action: AccountAction) {
    if (action !== this.activeAction?.action) {
      debug('Wrong action.');
      return;
    }

    this.activeAction!.form.lock();
  }

  async resetFormStep(action: AccountAction) {
    if (action !== this.activeAction?.action) {
      debug('Wrong action.');
      return;
    }

    this.activeAction!.form.unlock();
  }

  async submitForm(action: AccountAction) {
    if (action !== this.activeAction?.action) {
      debug('Wrong action.');
      return;
    }
    if (!this.activeAction!.form.locked) {
      debug('Cannot submit a form before it has been validated and locked.');
      return;
    }

    await this.activeAction!.form.submit();
  }

  private createForm(action: AccountAction) {
    const assetAddressStr = this.assetState.asset.address.toString();
    if (!isKnownAssetAddressString(assetAddressStr)) {
      throw new Error(`Attempting createForm with unknown asset address '${assetAddressStr}'`);
    }
    const txAmountLimit = this.txAmountLimits[assetAddressStr];
    switch (action) {
      case AccountAction.SEND:
        return new SendForm(
          this.accountState,
          this.assetState,
          this.provider,
          this.keyVault,
          this.sdk,
          this.rollup,
          this.accountUtils,
          txAmountLimit,
          SendMode.SEND,
        );
      case AccountAction.MERGE:
        return new MergeForm(this.accountState, this.assetState, this.provider, this.keyVault, this.sdk, this.rollup);
      case AccountAction.MIGRATE_OLD_BALANCE:
      case AccountAction.MIGRATE_FORGOTTON_BALANCE:
        return new MigrateForm(
          this.accountState,
          this.keyVault,
          this.provider,
          this.sdk,
          this.accountUtils,
          action === AccountAction.MIGRATE_OLD_BALANCE,
          this.assets,
        );
      default:
        return new ShieldForm(
          this.accountState,
          this.assetState,
          undefined,
          this.provider,
          this.ethAccount,
          this.keyVault,
          this.sdk,
          this.stableEthereumProvider,
          this.rollup,
          this.accountUtils,
          this.requiredNetwork,
          txAmountLimit,
        );
    }
  }

  private handleUserStateChange = async (userId: AccountId) => {
    // We might need to show the join-split txs from previous nonce.
    if (
      !userId.equals(this.userId) &&
      !userId.equals(new AccountId(this.userId.publicKey, this.userId.accountNonce - 1))
    ) {
      return;
    }

    this.debounceRefreshAccountState();
    this.debounceRefreshAssetState();
  };

  private refreshAccountState = async () => {
    const accountTxs = (await this.sdk.getAccountTxs(this.userId)).map(tx => parseAccountTx(tx, this.explorerUrl));
    const settled = accountTxs.length > 1 || !!accountTxs[0]?.settled;

    this.updateAccountState({
      accountTxs,
      settled,
    });
  };

  private refreshAssetState = async () => {
    const asset = this.assets[this.activeAsset];
    if (!this.isAssetEnabled(asset.id)) {
      await this.updateAssetState({
        ...initialAssetState,
        asset,
      });
      return;
    }

    const balance = this.sdk.getBalance(asset.id, this.userId);
    const spendableNotes = await this.sdk.getSpendableNotes(asset.id, this.userId);
    const spendableBalance = sumNotes(spendableNotes.slice(-2));
    const joinSplitTxs = await this.getJoinSplitTxs(asset.id, this.userId);

    const assetAddressStr = asset.address.toString();
    if (!isKnownAssetAddressString(assetAddressStr)) {
      throw new Error(`Attempting refreshAssetState with unknown asset address '${assetAddressStr}'`);
    }
    const txAmountLimit = this.txAmountLimits[assetAddressStr];

    this.updateAssetState({
      asset,
      balance,
      spendableNotes,
      spendableBalance,
      joinSplitTxs,
      price: this.priceFeedService.getPrice(asset.id),
      txAmountLimit,
    });
  };

  private async renewEthAccount() {
    this.ethAccount?.off(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
    const asset = this.assets[this.activeAsset];
    this.ethAccount = new EthAccount(
      this.provider,
      this.accountUtils,
      asset.id,
      this.rollup.supportedAssets[asset.id]?.address,
      this.requiredNetwork,
    );
    if (this.isAssetEnabled(asset.id)) {
      const pendingBalance = await this.ethAccount.refreshPendingBalance();
      this.ethAccount.on(EthAccountEvent.UPDATED_PENDING_BALANCE, this.onPendingBalanceChange);
      this.onPendingBalanceChange(pendingBalance);
    }
    this.activeAction?.form.changeEthAccount(this.ethAccount);
  }

  private onRollupStatusChange = (status: RollupStatus) => {
    const { nextPublishTime } = status;
    if (nextPublishTime.getTime() !== this.nextPublishTime.getTime()) {
      this.nextPublishTime = nextPublishTime;
      this.emit(UserAccountEvent.UPDATED_TXS_PUBLISH_TIME);
    }
  };

  private onPriceChange = (assetId: number, price: bigint) => {
    if (assetId === this.assetState.asset.id) {
      this.updateAssetState({ price });
    }
  };

  private onProviderStateChange = async () => {
    if (!this.ethAccount?.isSameAccount(this.provider)) {
      await this.renewEthAccount();
    }
  };

  private onPendingBalanceChange = (pendingBalance: bigint) => {
    this.updateAssetState({ pendingBalance });
  };

  private updateAccountState(accountState: Partial<AccountState>) {
    this.accountState = { ...this.accountState, ...accountState };
    this.emit(UserAccountEvent.UPDATED_ACCOUNT_STATE, this.accountState);
  }

  private updateAssetState(assetState: Partial<AssetState>) {
    this.assetState = { ...this.assetState, ...assetState };
    this.activeAction?.form.changeAssetState(this.assetState);
    this.emit(UserAccountEvent.UPDATED_ASSET_STATE, this.assetState);

    const { joinSplitTxs } = this.assetState;
    this.rollup.off(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    if (joinSplitTxs.some(tx => !tx.settled)) {
      this.rollup.on(RollupServiceEvent.UPDATED_STATUS, this.onRollupStatusChange);
    }
  }

  private updateAccountAction(accountAction?: { action: AccountAction; form: AccountForm }) {
    this.activeAction = accountAction;
    this.emit(UserAccountEvent.UPDATED_ACCOUNT_ACTION);
  }

  private async getJoinSplitTxs(assetId: number, userId: AccountId) {
    return (await this.sdk.getPaymentTxs(userId))
      .filter(tx => tx.value.assetId === assetId)
      .sort((a, b) => (!a.settled && b.settled ? -1 : 0))
      .map(tx => parseJoinSplitTx(tx, this.explorerUrl));
  }

  private isAssetEnabled(assetId: number) {
    return assetId <= this.maxAvailableAssetId;
  }
}
