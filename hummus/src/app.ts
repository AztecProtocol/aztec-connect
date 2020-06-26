import createDebug from 'debug';
import { EventEmitter } from 'events';
import { Sdk, SdkEvent, SdkInitState, UserTxAction, createSdk, RollupProviderExplorer } from 'aztec2-sdk';

const debug = createDebug('bb:app');

export enum AppEvent {
  UPDATED_PROOF_STATE = 'UPDATED_PROOF_STATE',
}

export enum ProofState {
  NADA = 'Nada',
  RUNNING = 'Running',
  FAILED = 'Failed',
  FINISHED = 'Finished',
}

interface ProofInput {
  userId: number;
  value: number;
  recipient: Buffer;
  created: Date;
}

export interface ProofEvent {
  state: ProofState;
  action?: UserTxAction;
  txHash?: Buffer;
  input?: ProofInput;
  time?: number;
}

export class App extends EventEmitter implements RollupProviderExplorer {
  private proofState: ProofEvent = { state: ProofState.NADA };
  private sdk!: Sdk;

  public async init(serverUrl: string) {
    if (this.isInitialized()) {
      await this.sdk.destroy();
    }

    this.sdk = await createSdk(serverUrl);

    for (const e in SdkEvent) {
      this.sdk.on((<any>SdkEvent)[e], (...args: any[]) => this.emit((<any>SdkEvent)[e], ...args));
    }

    await this.sdk.init();
  }

  public async destroy() {
    if (!this.isInitialized()) {
      return;
    }

    await this.sdk.destroy();
  }

  public async clearData() {
    if (!this.isInitialized()) {
      return;
    }
    await this.sdk.clearData();
  }

  private updateProofState(proof: ProofEvent) {
    this.proofState = proof;
    this.emit(AppEvent.UPDATED_PROOF_STATE, proof);
  }

  public isInitialized() {
    return this.getInitState() === SdkInitState.INITIALIZED;
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

  public async deposit(value: number) {
    const created = Date.now();
    const action = 'DEPOSIT';
    const user = this.sdk.getUser();
    const input = { userId: user.id, value, recipient: user.publicKey, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const txHash = await this.sdk.deposit(value);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({ action, state: ProofState.FAILED, input, time: Date.now() - created });
    }
  }

  public async withdraw(value: number) {
    const created = Date.now();
    const action = 'WITHDRAW';
    const user = this.sdk.getUser();
    const input = { userId: user.id, value, recipient: user.publicKey, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const txHash = await this.sdk.withdraw(value);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({ action, state: ProofState.FAILED, input, time: Date.now() - created });
    }
  }

  public async transfer(value: number, recipientStr: string) {
    const created = Date.now();
    const action = 'TRANSFER';
    const user = this.sdk.getUser();
    const recipient = Buffer.from(recipientStr, 'hex');
    const input = { userId: user.id, value, recipient, created: new Date(created) };
    this.updateProofState({ action, state: ProofState.RUNNING, input });
    try {
      const txHash = await this.sdk.transfer(value, recipient);
      this.updateProofState({ action, state: ProofState.FINISHED, txHash, input, time: Date.now() - created });
    } catch (err) {
      debug(err);
      this.updateProofState({ action, state: ProofState.FAILED, input, time: Date.now() - created });
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
}
