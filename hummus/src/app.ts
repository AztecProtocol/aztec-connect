import {
  Sdk,
  SdkEvent,
  SdkInitState,
  UserTxAction,
  createSdk,
  RollupProviderExplorer,
  RollupProviderStatus,
} from 'aztec2-sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { EthProvider, chainIdToNetwork, EthProviderEvent, Network } from './eth_provider';
import { MetamaskSigner } from './signer';
import { TokenContract } from './token_contract';

const debug = createDebug('bb:app');

// TODO - fetch this value from the sdk
const NOTE_SCALE = 10000000000000000n;

export enum AppEvent {
  UPDATED_PROOF_STATE = 'UPDATED_PROOF_STATE',
  UPDATED_TOKEN_BALANCE = 'UPDATED_TOKEN_BALANCE',
  UPDATED_NETWORK_AND_CONTRACTS = 'UPDATED_NETWORK_AND_CONTRACTS',
  APPROVED = 'APPROVED',
}

export enum ProofState {
  NADA = 'Nada',
  RUNNING = 'Running',
  FAILED = 'Failed',
  FINISHED = 'Finished',
}

interface ProofInput {
  userId: number;
  value: bigint;
  recipient: Buffer;
  created: Date;
}

export interface ProofEvent {
  state: ProofState;
  action?: UserTxAction | 'MINT';
  txHash?: Buffer;
  input?: ProofInput;
  error?: string;
  time?: number;
}

export class App extends EventEmitter implements RollupProviderExplorer {
  private proofState: ProofEvent = { state: ProofState.NADA };
  private sdk!: Sdk;
  private tokenContract!: TokenContract;
  private providerStatus!: RollupProviderStatus;

  constructor(public ethProvider: EthProvider) {
    super();

    ethProvider.on(EthProviderEvent.UPDATED_NETWORK, this.updateNetworkAndContracts);
  }

  public async init(serverUrl: string) {
    if (this.isInitialized()) {
      await this.sdk.destroy();
    }

    this.sdk = await createSdk(serverUrl);

    for (const e in SdkEvent) {
      this.sdk.on((SdkEvent as any)[e], (...args: any[]) => this.emit((SdkEvent as any)[e], ...args));
    }

    this.providerStatus = await this.sdk.getStatus();

    this.requestEthProviderAccess();

    await this.sdk.init();
  }

  public async destroy() {
    if (!this.isInitialized()) {
      return;
    }

    await this.sdk.destroy();
    this.ethProvider.off(EthProviderEvent.UPDATED_NETWORK, this.updateNetworkAndContracts);
  }

  public async clearData() {
    if (!this.isInitialized()) {
      return;
    }
    await this.sdk.clearData();
  }

  private updateNetworkAndContracts = async (network: Network) => {
    if (this.providerStatus && this.isCorrectNetwork()) {
      this.tokenContract = new TokenContract(network, this.providerStatus.tokenContractAddress, NOTE_SCALE);
      await this.tokenContract.init();
    }
    this.emit(AppEvent.UPDATED_NETWORK_AND_CONTRACTS, network);
  };

  private updateProofState(proof: ProofEvent) {
    this.proofState = proof;
    this.emit(AppEvent.UPDATED_PROOF_STATE, proof);
  }

  private updateApprovalState(approval: boolean) {
    this.emit(AppEvent.APPROVED, approval);
  }

  public isInitialized() {
    return this.getInitState() === SdkInitState.INITIALIZED;
  }

  public isCorrectNetwork() {
    return chainIdToNetwork(this.providerStatus.chainId) === this.ethProvider.getNetwork();
  }

  public getInitState() {
    return this.sdk ? this.sdk.getInitState() : SdkInitState.UNINITIALIZED;
  }

  public getProofState() {
    return this.proofState;
  }

  public getDataRoot() {
    return this.sdk.getDataRoot();
  }

  public getDataSize() {
    return this.sdk.getDataSize();
  }

  public async getStatus() {
    return await this.sdk.getStatus();
  }

  public getProviderStatus() {
    return this.providerStatus;
  }

  public async requestEthProviderAccess() {
    await this.ethProvider.requestAccess(async () => {
      const network = this.ethProvider.getNetwork();
      await this.updateNetworkAndContracts(network);
    });
  }

  public async approve(value: bigint) {
    this.updateApprovalState(true);
    try {
      const { rollupContractAddress } = await this.sdk.getStatus();
      await this.tokenContract.approve(rollupContractAddress, value);
      this.updateApprovalState(false);
    } catch (err) {
      debug(err);
      this.updateApprovalState(false);
    }
  }

  public async deposit(value: bigint, account: string) {
    const created = Date.now();
    const action = 'DEPOSIT';
    const user = this.sdk.getUser();
    const input = { userId: user.id, value, recipient: user.publicKey, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const tokenBalance = await this.tokenContract.balanceOf(account);
      if (tokenBalance < value) {
        this.updateProofState({
          action,
          state: ProofState.FAILED,
          input,
          error: `Token balance is insufficient for a deposit of ${value}.`,
          time: Date.now() - created,
        });
        return;
      }

      const signer = new MetamaskSigner(account);
      const txHash = await this.sdk.deposit(Number(value), signer);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({
        action,
        state: ProofState.FAILED,
        input,
        error: err.message,
        time: Date.now() - created,
      });
    }
  }

  public async withdraw(value: bigint, recipientStr: string) {
    const created = Date.now();
    const action = 'WITHDRAW';
    const user = this.sdk.getUser();
    const recipient = Buffer.from(recipientStr.replace(/^0x/, ''), 'hex');
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const txHash = await this.sdk.withdraw(Number(value), recipient);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({
        action,
        state: ProofState.FAILED,
        input,
        error: err.message,
        time: Date.now() - created,
      });
    }
  }

  public async transfer(value: bigint, recipientStr: string) {
    const created = Date.now();
    const action = 'TRANSFER';
    const user = this.sdk.getUser();
    const recipient = Buffer.from(recipientStr, 'hex');
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const txHash = await this.sdk.transfer(Number(value), recipient);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({
        action,
        state: ProofState.FAILED,
        input,
        error: err.message,
        time: Date.now() - created,
      });
    }
  }

  public async publicTransfer(value: bigint, account: string, recipientStr: string) {
    const created = Date.now();
    const action = 'PUBLIC_TRANSFER';
    const user = this.sdk.getUser();
    const recipient = Buffer.from(recipientStr.replace(/^0x/, ''), 'hex');
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const tokenBalance = await this.tokenContract.balanceOf(account);
      if (tokenBalance < value) {
        this.updateProofState({
          action,
          state: ProofState.FAILED,
          input,
          error: `Token balance is insufficient to transfer ${value}.`,
          time: Date.now() - created,
        });
        return;
      }

      const signer = new MetamaskSigner(account);
      const txHash = await this.sdk.publicTransfer(Number(value), signer, recipient);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({
        action,
        state: ProofState.FAILED,
        input,
        error: err.message,
        time: Date.now() - created,
      });
    }
  }

  public getUser() {
    return this.sdk.getUser();
  }

  public getUsers(localOnly: boolean = true) {
    return this.sdk ? this.sdk.getUsers(localOnly) : [];
  }

  public async createUser(alias?: string) {
    return this.sdk.createUser(alias);
  }

  public async addUser(alias: string, publicKey: Buffer) {
    return this.sdk.addUser(alias, publicKey);
  }

  public switchToUser(userIdOrAlias: string | number) {
    return this.sdk.switchToUser(userIdOrAlias);
  }

  public getBalance(userIdOrAlias?: string | number) {
    return this.sdk.getBalance(userIdOrAlias);
  }

  public getLatestRollups() {
    return this.sdk.getLatestRollups();
  }

  public getLatestTxs() {
    return this.sdk.getLatestTxs();
  }

  public async getRollup(rollupId: number) {
    return this.sdk.getRollup(rollupId);
  }

  public async getTx(txHash: Buffer) {
    return this.sdk.getTx(txHash);
  }

  public getUserTxs(userId: number) {
    return this.sdk.getUserTxs(userId);
  }

  public findUser(userIdOrAlias: string | number, remote: boolean = false) {
    return this.sdk.findUser(userIdOrAlias, remote);
  }

  public startTrackingGlobalState() {
    this.sdk.startTrackingGlobalState();
  }

  public stopTrackingGlobalState() {
    this.sdk.stopTrackingGlobalState();
  }

  public async getTokenBalance(account: string) {
    return this.tokenContract.balanceOf(account);
  }

  public async getRollupContractAllowance(account: string) {
    const { rollupContractAddress } = await this.sdk.getStatus();
    return this.tokenContract.allowance(account, rollupContractAddress);
  }

  public async mintToken(account: string, value: bigint) {
    const action = 'MINT';
    this.updateProofState({ action, state: ProofState.RUNNING });

    try {
      await this.tokenContract.mint(account, value);
    } catch (err) {
      debug(err);
      this.updateProofState({
        action,
        state: ProofState.FAILED,
        error: err.message,
      });
      return;
    }

    const balance = await this.getTokenBalance(account);
    this.emit(AppEvent.UPDATED_TOKEN_BALANCE, balance);

    this.updateProofState({ action, state: ProofState.FINISHED });
  }

  private subscribeToTokenBalance() {
    // TODO
  }

  public toTokenValueString = (noteValue: bigint) => {
    const scaledTokenValue = this.tokenContract.toScaledTokenValue(noteValue);
    const decimals = this.tokenContract.getDecimals();
    const valStr = scaledTokenValue.toString().padStart(decimals + 1, '0');
    const integer = valStr.slice(0, valStr.length - decimals);
    const mantissa = valStr.slice(-decimals).replace(/0+$/, '');
    return mantissa ? `${integer}.${mantissa}` : integer;
  };

  public toNoteValue = (tokenValueString: string) => {
    const [integer, decimalStr] = `${tokenValueString}`.split('.');
    const decimal = (decimalStr || '').replace(/0+$/, '');
    const scalingFactor = 10n ** BigInt(this.tokenContract.getDecimals());
    const decimalScale = scalingFactor / 10n ** BigInt(decimal?.length || 0);
    const scaledTokenValue = BigInt(decimal || 0) * decimalScale + BigInt(integer || 0) * scalingFactor;
    return this.tokenContract.toNoteValue(scaledTokenValue);
  };
}
