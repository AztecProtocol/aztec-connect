import {
  AssetFeeQuote,
  AssetId,
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

  private statusSubscriber?: number;

  constructor(private sdk: WalletSdk, private readonly pollInterval = 60 * 1000) {
    super();
  }

  getStatus() {
    return this.status;
  }

  destroy() {
    this.removeAllListeners();
    clearInterval(this.statusSubscriber);
  }

  async init() {
    const status = await this.sdk.getRemoteStatus();
    this.rollupContractAddress = status.blockchainStatus.rollupContractAddress;
    this.status = fromRollupProviderStatus(status);
    this.subscribeToStatus();
  }

  getMinFee(assetId: AssetId, txType: TxType) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    return feeConstants[txType] + baseFeeQuotes[SettlementTime.SLOW].fee;
  }

  getSettledIn(assetId: AssetId, type: TxType, fee: bigint) {
    const { feeConstants, baseFeeQuotes } = this.status.txFees[assetId];
    const extra = fee - feeConstants[type];
    const speed = [SettlementTime.INSTANT, SettlementTime.FAST, SettlementTime.AVERAGE, SettlementTime.SLOW].find(
      t => extra >= baseFeeQuotes[t].fee,
    );
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
