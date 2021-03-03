import {
  AssetFeeQuote,
  AssetId,
  EthAddress,
  RollupProviderStatus,
  SettlementTime,
  TxType,
  WalletSdk,
} from '@aztec/sdk';
import createDebug from 'debug';
import { Web3Provider } from '@ethersproject/providers';
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
];

export class RollupService extends EventEmitter {
  private status!: RollupStatus;
  private rollupContractAddress!: EthAddress;

  private statusSubscriber?: number;

  constructor(private sdk: WalletSdk, private readonly pollInterval = 5000) {
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

  async getDepositGasCost(assetId: AssetId, amount: bigint, provider: Provider) {
    const web3Provider = new Web3Provider(provider.ethereumProvider);
    const rollupProcessor = new Contract(this.rollupContractAddress.toString(), RollupABI, web3Provider.getSigner());
    const gasPrice = await rollupProcessor.provider.getGasPrice();
    const gas = await rollupProcessor.estimateGas.depositPendingFunds(assetId, amount, provider.account!.toString(), {
      value: amount,
      gasPrice,
    });
    return BigInt(gas.mul(gasPrice).toString());
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
        this.status = status;
        this.emit(RollupServiceEvent.UPDATED_STATUS, this.status);
      }
    };

    this.statusSubscriber = window.setInterval(updateStatus, this.pollInterval);
  }
}
