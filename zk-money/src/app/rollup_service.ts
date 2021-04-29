import {
  AssetFeeQuote,
  AssetId,
  BlockchainAsset,
  EthAddress,
  RollupProviderStatus,
  SettlementTime,
  TxType,
  WalletSdk,
} from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import createDebug from 'debug';
import { Contract } from 'ethers';
import EventEmitter from 'events';
import { isEqual } from 'lodash';
import { Provider } from './provider';

const debug = createDebug('zm:rollup_service');

export enum RollupServiceEvent {
  UPDATED_STATUS = 'UPDATED_STATUS',
}

const speeds = [SettlementTime.SLOW, SettlementTime.AVERAGE, SettlementTime.FAST, SettlementTime.INSTANT];

export interface TxFee {
  fee: bigint;
  time: number;
  speed: SettlementTime;
}

export interface RollupStatus {
  txFees: AssetFeeQuote[];
  nextPublishTime: Date;
}

const fromRollupProviderStatus = ({ txFees, nextPublishTime }: RollupProviderStatus) => ({
  txFees,
  nextPublishTime,
});

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
  private rollupContractAddress!: EthAddress;
  private assets!: BlockchainAsset[];

  private statusSubscriber?: number;

  constructor(private sdk: WalletSdk, private readonly pollInterval = 60 * 1000) {
    super();
  }

  getStatus() {
    return this.status;
  }

  get supportedAssets() {
    return this.assets;
  }

  destroy() {
    this.removeAllListeners();
    clearInterval(this.statusSubscriber);
  }

  async init() {
    const status = await this.sdk.getRemoteStatus();
    this.rollupContractAddress = status.blockchainStatus.rollupContractAddress;
    this.assets = status.blockchainStatus.assets;
    this.status = fromRollupProviderStatus(status);
    this.subscribeToStatus();
  }

  getTxFees(assetId: AssetId, txType: TxType) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    const baseFee = feeConstants[txType];
    const txFees: TxFee[] = [];
    for (const speed of speeds) {
      txFees[speed] = { speed, fee: baseFee + baseFeeQuotes[speed].fee, time: baseFeeQuotes[speed].time };
    }
    return txFees;
  }

  getFee(assetId: AssetId, txType: TxType, speed: SettlementTime) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    return feeConstants[txType] + baseFeeQuotes[speed].fee;
  }

  getMinFee(assetId: AssetId, txType: TxType) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    return feeConstants[txType] + baseFeeQuotes[SettlementTime.SLOW].fee;
  }

  getSettledIn(assetId: AssetId, type: TxType, fee: bigint) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    const extra = fee - feeConstants[type];
    const speed = [...speeds].reverse().find(t => extra >= baseFeeQuotes[t].fee);
    return baseFeeQuotes[speed !== undefined ? speed : SettlementTime.SLOW].time;
  }

  async getDepositGas(assetId: AssetId, amount: bigint, provider: Provider) {
    const web3Provider = new Web3Provider(provider.ethereumProvider);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, web3Provider.getSigner());
    const ethAddress = provider.account!;
    try {
      const gas = await rollupProcessor.estimateGas.depositPendingFunds(assetId, amount, ethAddress.toString(), {
        value: assetId === AssetId.ETH ? amount : 0n,
      });
      return BigInt(gas);
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
      return BigInt(gas);
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

      const status = fromRollupProviderStatus(await this.sdk.getRemoteStatus());
      if (!isEqual(status, this.status)) {
        const prevStatus = this.status;
        this.status = status;
        this.emit(RollupServiceEvent.UPDATED_STATUS, this.status, prevStatus);
      }
    };

    this.statusSubscriber = window.setInterval(updateStatus, this.pollInterval);
  }
}
