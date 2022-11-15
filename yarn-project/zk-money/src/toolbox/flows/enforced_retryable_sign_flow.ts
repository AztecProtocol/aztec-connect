import { Signer } from '@ethersproject/abstract-signer';
import { EthAddress } from '@aztec/sdk';
import { ActiveChainIdObs } from '../../alt-model/active_wallet_hooks.js';
import { ActiveSignerObs } from '../../alt-model/defi/defi_form/correct_provider_hooks.js';
import { Fullfiller } from '../../app/util/index.js';
import { Emit, ThrowIfCancelled } from './flows_utils.js';

interface Actions {
  sign?: () => void;
  retrySign?: () => void;
}

export interface EnforcedRetryableSignFlowState {
  actions: Actions;
  busy: boolean;
  correctSignerIsActive: boolean;
  requiredSignerAddress: EthAddress;
  activeSignerAddress?: EthAddress;
  wrongChainId: boolean;
  requiredChainId?: number;
}

const SIGNATURE_RETRY_TIMEOUT = 30e3;

type RaceResult =
  | { type: 'signer'; signer: Signer | null | undefined }
  | { type: 'chainId'; chainId: number | undefined };

class MonitorLoop<TResult> {
  private resultFullfiller = new Fullfiller<TResult>();
  private isTrackingChainId: boolean;
  private activeSignerAddress: EthAddress | undefined;
  private correctSignerIsActive = false;
  private wrongChainId = false;
  private looping = false;
  private busy = false;
  private retryEnabled = false;
  private killed = false;

  constructor(
    private emitState: Emit<EnforcedRetryableSignFlowState>,
    private throwIfCancelled: ThrowIfCancelled,
    private sign: () => Promise<TResult>,
    private activeSignerObs: ActiveSignerObs,
    private requiredSignerAddress: EthAddress,
    private requiredChainId?: number,
    private activeChainIdObs?: ActiveChainIdObs,
  ) {
    this.isTrackingChainId = requiredChainId !== undefined;
    if (this.isTrackingChainId && activeChainIdObs === undefined) {
      throw new Error('activeChainIdObs required from tracking chainId');
    }
  }

  getResult() {
    return this.resultFullfiller.promise;
  }

  async start() {
    this.looping = true;
    let activeSigner = this.activeSignerObs.value;
    let chainId = this.activeChainIdObs?.value;
    while (this.looping) {
      await this.processSignerAndChainId(activeSigner, chainId);
      const signerOrChainId = await this.nextSignerOrChainId();
      if (signerOrChainId.type === 'signer') activeSigner = signerOrChainId.signer;
      if (signerOrChainId.type === 'chainId') chainId = signerOrChainId.chainId;
    }
  }

  kill() {
    this.killed = true;
    this.looping = false;
  }

  private nextSignerOrChainId(): Promise<RaceResult> {
    const racers: Promise<RaceResult>[] = [];
    racers.push(this.activeSignerObs.whenNext().then(signer => ({ type: 'signer', signer })));
    if (this.isTrackingChainId && this.activeChainIdObs) {
      racers.push(this.activeChainIdObs.whenNext().then(chainId => ({ type: 'chainId', chainId })));
    }
    return Promise.race(racers);
  }

  private handleUserInvoke = async () => {
    this.busy = true;
    this.retryEnabled = false;
    this.emitLatestState();

    setTimeout(() => {
      this.retryEnabled = true;
      this.emitLatestState();
    }, SIGNATURE_RETRY_TIMEOUT);

    try {
      const result = await this.sign();
      // Ignore the result if the signer or network has since changed from the
      // correct one.
      if (this.correctSignerIsActive && !this.wrongChainId) {
        this.looping = false;
        this.resultFullfiller.resolve(result);
      }
    } catch (err) {
      this.resultFullfiller.reject(err);
    }
  };

  private emitLatestState() {
    if (this.killed) return;
    this.emitState({
      actions: this.getCurrentActions(),
      busy: this.busy,
      correctSignerIsActive: this.correctSignerIsActive,
      requiredSignerAddress: this.requiredSignerAddress,
      activeSignerAddress: this.activeSignerAddress,
      wrongChainId: this.wrongChainId,
      requiredChainId: this.requiredChainId,
    });
  }

  private getCurrentActions(): Actions {
    if (this.correctSignerIsActive) {
      if (!this.busy) {
        return { sign: this.handleUserInvoke };
      } else if (this.retryEnabled) {
        return { retrySign: this.handleUserInvoke };
      }
    }
    return {};
  }

  private async processSignerAndChainId(signer: Signer | null | undefined, chainId: number | undefined) {
    if (signer) {
      const activeSignerAddressStr = await signer.getAddress();
      this.activeSignerAddress = EthAddress.fromString(activeSignerAddressStr);
      this.correctSignerIsActive = this.activeSignerAddress.equals(this.requiredSignerAddress);
    } else {
      this.activeSignerAddress = undefined;
      this.correctSignerIsActive = false;
    }
    this.wrongChainId = this.isTrackingChainId && chainId !== this.requiredChainId;
    this.emitLatestState();
  }
}

export async function enforcedRetryableSignFlow<TResult>(
  emitState: Emit<EnforcedRetryableSignFlowState>,
  throwIfCancelled: ThrowIfCancelled,
  sign: () => Promise<TResult>,
  activeSignerObs: ActiveSignerObs,
  requiredSignerAddress: EthAddress,
  requiredChainId?: number,
  activeChainId?: ActiveChainIdObs,
) {
  const monitorLoop = new MonitorLoop<TResult>(
    emitState,
    throwIfCancelled,
    sign,
    activeSignerObs,
    requiredSignerAddress,
    requiredChainId,
    activeChainId,
  );
  try {
    monitorLoop.start();
    const result = await throwIfCancelled(monitorLoop.getResult());
    return result;
  } finally {
    monitorLoop.kill();
  }
}
