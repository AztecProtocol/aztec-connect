import { AssetValue, AztecSdk, BlockchainAsset, EthAddress, TxSettlementTime, TxType } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { Contract } from 'ethers';
import EventEmitter from 'events';
import { isEqual } from 'lodash';
import { assets } from './assets';
import { Provider } from './provider';

const debug = createDebug('zm:rollup_service');

export enum RollupServiceEvent {
  UPDATED_STATUS = 'UPDATED_STATUS',
}

const speeds = [TxSettlementTime.NEXT_ROLLUP, TxSettlementTime.INSTANT];
const publishTimeRatio = [1, 0];

export interface TxFee {
  fee: bigint;
  time: number;
  speed: TxSettlementTime;
}

export interface RollupStatus {
  txFees: AssetValue[][][]; // [AssetId][TxType][TxSettlementTime]
  nextPublishTime: Date;
}

const RollupABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assetId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'depositorAddress',
        type: 'address',
      },
    ],
    name: 'depositPendingFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  'function approveProof(bytes32 _proofHash)',
];

export interface RollupService {
  on(
    event: RollupServiceEvent.UPDATED_STATUS,
    listener: (status: RollupStatus, prevStatus: RollupStatus) => void,
  ): this;
}

export class RollupService extends EventEmitter {
  private status!: RollupStatus;
  private publishInterval!: number;
  private rollupContractAddress!: EthAddress;
  private assets!: BlockchainAsset[];

  private statusSubscriber?: number;

  constructor(private sdk: AztecSdk, private readonly pollInterval = 60 * 1000) {
    super();
  }

  get supportedAssets() {
    return this.assets;
  }

  get nextPublishTime() {
    return this.status.nextPublishTime;
  }

  destroy() {
    this.removeAllListeners();
    clearInterval(this.statusSubscriber);
  }

  async init() {
    const {
      blockchainStatus,
      nextPublishTime,
      runtimeConfig: { publishInterval },
    } = await this.sdk.getRemoteStatus();
    this.rollupContractAddress = blockchainStatus.rollupContractAddress;
    this.assets = blockchainStatus.assets;
    this.status = {
      nextPublishTime,
      txFees: await this.fetchTxFees(),
    };
    this.publishInterval = publishInterval;
    this.subscribeToStatus();
  }

  getTxFees(assetId: number, txType: TxType): TxFee[] {
    const fees = this.status.txFees[assetId][txType];
    const txFees = fees.map(({ value }, i) => ({
      speed: speeds[i],
      fee: value,
      time: Math.ceil(this.publishInterval * publishTimeRatio[i]),
    }));
    if (txType === TxType.ACCOUNT) {
      const depositFees = this.status.txFees[assetId][TxType.DEPOSIT];
      txFees.forEach((txFee, i) => (txFee.fee += depositFees[i].value));
    }
    return txFees;
  }

  getFee(assetId: number, txType: TxType, speed: TxSettlementTime) {
    return this.status.txFees[assetId][txType][speed].value;
  }

  async getDepositGas(assetId: number, amount: bigint, provider: Provider) {
    const web3Provider = new Web3Provider(provider.ethereumProvider);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, web3Provider.getSigner());
    const ethAddress = provider.account!;
    try {
      const gas = await rollupProcessor.estimateGas.depositPendingFunds(assetId, amount, ethAddress.toString(), {
        value: assetId === 0 ? amount : 0n,
      });
      return BigInt(gas.toString());
    } catch (e) {
      debug(e);
      // Probably not enough balance.
      return 70000n;
    }
  }

  async getApproveProofGas(provider: Provider) {
    const web3Provider = new Web3Provider(provider.ethereumProvider);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, web3Provider.getSigner());
    const proofHash = '0x'.padEnd(66, '0');
    try {
      const gas = await rollupProcessor.estimateGas.approveProof(proofHash.toString());
      return BigInt(gas.toString());
    } catch (e) {
      debug(e);
      // Probably not enough balance.
      return 50000n;
    }
  }

  private subscribeToStatus() {
    if (this.statusSubscriber) {
      debug('Already subscribed to rollup status changes.');
      return;
    }

    const updateStatus = async () => {
      if (!this.listenerCount(RollupServiceEvent.UPDATED_STATUS)) return;

      // TODO - avoid polling remote status
      const { nextPublishTime } = await this.sdk.getRemoteStatus();
      const status = {
        txFees: await this.fetchTxFees(),
        nextPublishTime,
      };
      if (!isEqual(status, this.status)) {
        const prevStatus = this.status;
        this.status = status;
        this.emit(RollupServiceEvent.UPDATED_STATUS, this.status, prevStatus);
      }
    };

    this.statusSubscriber = window.setInterval(updateStatus, this.pollInterval);
  }

  private async fetchTxFees() {
    const txFees: AssetValue[][][] = [];
    for (const { id } of assets) {
      txFees[id] = await this.sdk.getTxFees(id);
    }
    return txFees;
  }
}
