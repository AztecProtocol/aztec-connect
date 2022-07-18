import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { fromBaseUnits } from '@aztec/blockchain';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { EthAddress } from '@aztec/barretenberg/address';
import { PublicClient } from 'coinbase-pro';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { RollupDb } from '../rollup_db';
import { RollupProfile } from '../pipeline_coordinator/rollup_profiler';
import { TxDao, BridgeMetricsDao, RollupDao } from '../entity';
import { RollupTx } from '../pipeline_coordinator/bridge_tx_queue';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { TxFeeResolver } from '../tx_fee_resolver';
import { DefiDepositProofData } from '@aztec/barretenberg/client_proofs/proof_data/defi_deposit_proof_data';
import { BridgeResolver } from '../bridge';

export class Metrics {
  private receiveTxDuration: Histogram<string>;
  private txRollupDuration: Histogram<string>;
  private rootRollupDuration: Histogram<string>;
  private txSettlementHistogram: Histogram<string>;
  private publishHistogram: Histogram<string>;
  private processBlockHistogram: Histogram<string>;

  private rollupGasUsed: Gauge<string>;
  private rollupGasPrice: Gauge<string>;
  private rollupSize: Gauge<string>;
  private rollupTxs: Gauge<string>;
  private totalDeposited: Gauge<string>;
  private totalWithdrawn: Gauge<string>;
  private totalDefiDeposited: Gauge<string>;
  private totalDefiClaimed: Gauge<string>;
  private totalFees: Gauge<string>;
  private rollupContractBalance: Gauge<string>;
  private feeDistributorContractBalance: Gauge<string>;
  private bridgeRollupTxs: Gauge<string>;
  private bridgeRollupGas: Gauge<string>;
  private bridgeRollupGasAcc: Gauge<string>;
  private bridgeRollupUsdCost: Gauge<string>;
  private bridgeRollupUsdFees: Gauge<string>;
  private bridgeRollupTxGauge: Gauge<string>;
  private rollupTransactions: Gauge<string>;
  private rollupGasBalance: Gauge<string>;
  private rollupBridgeDepositValue: Gauge<string>;
  private totalBridgeDepositValue: Gauge<string>;

  private httpEndpointCounter: Counter<string>;
  private txReceivedCounter: Counter<string>;
  private bridgeTotalTxCounter: Counter<string>;
  private bridgeTotalGasAccCounter: Counter<string>;
  private bridgeTotalTimesCalledCounter: Counter<string>;
  private bridgeTotalAztecCallsCounter: Counter<string>;
  private bridgetotalUsdCost: Counter<string>;
  private bridgeTotalUsdFees: Counter<string>;

  private coinbaseClient: PublicClient = new PublicClient();

  constructor(
    worldStateDb: WorldStateDb,
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    public rollupBeneficiary: EthAddress,
  ) {
    client.collectDefaultMetrics();

    new Gauge({
      name: 'tx_total',
      help: 'Total transactions',
      async collect() {
        this.set(await rollupDb.getTotalTxCount());
      },
    });

    new Gauge({
      name: 'tx_pending_total',
      help: 'Pending transactions',
      async collect() {
        this.set(await rollupDb.getPendingTxCount());
      },
    });

    new Gauge({
      name: 'tx_unsettled_total',
      help: 'Unsettled transactions',
      async collect() {
        this.set(await rollupDb.getUnsettledTxCount());
      },
    });

    new Gauge({
      name: 'tx_join_split_total',
      help: 'Total join split transactions',
      async collect() {
        this.set(await rollupDb.getJoinSplitTxCount());
      },
    });

    new Gauge({
      name: 'tx_defi_total',
      help: 'Total defi transactions',
      async collect() {
        this.set(await rollupDb.getDefiTxCount());
      },
    });

    new Gauge({
      name: 'tx_account_total',
      help: 'Total account transactions',
      async collect() {
        this.set(await rollupDb.getAccountTxCount());
      },
    });

    new Gauge({
      name: 'tx_registrations_total',
      help: 'Total registration transactions',
      async collect() {
        this.set(await rollupDb.getAccountCount());
      },
    });

    new Gauge({
      name: 'world_state_data_size',
      help: 'Size of data tree',
      collect() {
        this.set(Number(worldStateDb.getSize(0)));
      },
    });

    new Gauge({
      name: 'rollup_total',
      help: 'Total rollups',
      async collect() {
        this.set(await rollupDb.getNextRollupId());
      },
    });

    this.rollupSize = new Gauge({
      name: 'rollup_size',
      help: 'Rollup size',
    });

    this.rollupTxs = new Gauge({
      name: 'rollup_txs',
      help: 'Number of txs in rollup',
    });

    this.rollupGasUsed = new Gauge({
      name: 'rollup_gas_used',
      help: 'Total gas used by rollup',
    });

    this.rollupGasPrice = new Gauge({
      name: 'rollup_gas_price',
      help: 'Gas price for rollup',
    });

    this.totalDeposited = new Gauge({
      name: 'total_deposited',
      help: 'Total deposited',
      labelNames: ['symbol'],
    });

    this.totalWithdrawn = new Gauge({
      name: 'total_withdrawn',
      help: 'Total withdrawn',
      labelNames: ['symbol'],
    });

    this.totalDefiDeposited = new Gauge({
      name: 'total_defi_deposited',
      help: 'Total defi deposited',
      labelNames: ['symbol'],
    });

    this.totalDefiClaimed = new Gauge({
      name: 'total_defi_claimed',
      help: 'Total defi claimed',
      labelNames: ['symbol'],
    });

    this.totalFees = new Gauge({
      name: 'total_fees',
      help: 'Total fees',
      labelNames: ['symbol'],
    });

    this.rollupContractBalance = new Gauge({
      name: 'rollup_contract_balance',
      help: 'Current balance on rollup contract',
      labelNames: ['symbol'],
    });

    this.feeDistributorContractBalance = new Gauge({
      name: 'fee_contract_balance',
      help: 'Current balance on fee distributor contract',
      labelNames: ['symbol'],
    });

    this.bridgeRollupTxs = new Gauge({
      name: 'bridge_rollup_txs',
      help: 'Num txs for full rollup for bridge',
      labelNames: ['bridgeId'],
    });

    this.bridgeRollupGas = new Gauge({
      name: 'bridge_rollup_gas',
      help: 'Total gas in rollup for bridge',
      labelNames: ['bridgeId'],
    });

    this.bridgeRollupGasAcc = new Gauge({
      name: 'bridge_gas_acc',
      help: 'Gas accumulated for bridge',
      labelNames: ['bridge_id'],
    });

    this.bridgeRollupUsdCost = new Gauge({
      name: 'bridge_rollup_usd_cost',
      help: 'USD cost of this bridge in rollup',
      labelNames: ['bridge_id'],
    });

    this.bridgeRollupUsdFees = new Gauge({
      name: 'bridge_rollup_usd_fees',
      help: 'USD Fees accrued by bridge in rollup',
      labelNames: ['bridge_id'],
    });

    this.bridgeRollupTxGauge = new Gauge({
      name: 'bridge_rollup_tx',
      help: 'Bridge transactions received in rollup',
      labelNames: ['bridge_id'],
    });

    this.rollupTransactions = new Gauge({
      name: 'transactions_in_next_rollup',
      help: 'Transactions for next rollup',
    });

    this.rollupGasBalance = new Gauge({
      name: 'rollup_gas_balance',
      help: 'Rollup gas balance',
    });

    this.rollupBridgeDepositValue = new Gauge({
      name: 'bridge_deposit_value',
      help: 'Bridge Deposit Value',
      labelNames: ['bridgeId'],
    });

    this.totalBridgeDepositValue = new Gauge({
      name: 'total_bridge_deposit_value',
      help: 'Total Bridge Deposit Value',
      labelNames: ['bridgeId'],
    });

    this.receiveTxDuration = new Histogram({
      name: 'tx_received_duration_seconds',
      help: 'Time to process received transaction',
    });

    this.txRollupDuration = new Histogram({
      name: 'create_tx_rollup_duration_seconds',
      help: 'Time to create a transaction rollup',
    });

    this.rootRollupDuration = new Histogram({
      name: 'create_root_rollup_duration_seconds',
      help: 'Time to create a root rollup',
    });

    this.txSettlementHistogram = new Histogram({
      name: 'tx_settlement_duration_seconds',
      help: 'Time between receiving a transaction and its settlement on-chain',
    });

    this.publishHistogram = new Histogram({
      name: 'publish_duration_seconds',
      help: 'Time to publish a rollup on-chain',
    });

    this.processBlockHistogram = new Histogram({
      name: 'process_block_duration_seconds',
      help: 'Time to process a received block',
    });

    this.httpEndpointCounter = new Counter({
      name: 'http_endpoint_request',
      help: 'Http endpoint request counter',
      labelNames: ['path'],
    });

    this.txReceivedCounter = new Counter({
      name: 'tx_received',
      help: 'Transaction received counter',
      labelNames: ['tx_type'],
    });

    this.bridgeTotalTxCounter = new Counter({
      name: 'bridge_total_tx',
      help: 'Total bridge transactions',
      labelNames: ['bridge_id'],
    });

    this.bridgeTotalGasAccCounter = new Counter({
      name: 'bridge_total_gas_acc',
      help: 'Gas accumulated for bridge',
      labelNames: ['bridge_id'],
    });

    this.bridgeTotalTimesCalledCounter = new Counter({
      name: 'bridge_total_times_called',
      help: 'Total times a bridge has been called',
      labelNames: ['bridge_id'],
    });

    this.bridgeTotalAztecCallsCounter = new Counter({
      name: 'bridge_total_aztec_times_called',
      help: 'Totaltimes a bridge has been called by Aztec rollups',
      labelNames: ['bridge_id'],
    });

    this.bridgetotalUsdCost = new Counter({
      name: 'bridge_total_usd_cost',
      help: 'Total USD cost of bridge',
      labelNames: ['bridge_id'],
    });

    this.bridgeTotalUsdFees = new Counter({
      name: 'bridge_total_usd_fees',
      help: 'Total USD fees accrued by bridge',
      labelNames: ['bridge_id'],
    });
  }

  receiveTxTimer() {
    return this.receiveTxDuration.startTimer();
  }

  txRollupTimer() {
    return this.txRollupDuration.startTimer();
  }

  rootRollupTimer() {
    return this.rootRollupDuration.startTimer();
  }

  publishTimer() {
    return this.publishHistogram.startTimer();
  }

  processBlockTimer() {
    return this.processBlockHistogram.startTimer();
  }

  txSettlementDuration(ms: number) {
    this.txSettlementHistogram.observe(ms / 1000);
  }

  httpEndpoint(path: string) {
    this.httpEndpointCounter.labels(path).inc();
  }

  txReceived(txType: TxType) {
    this.txReceivedCounter.labels(TxType[txType]).inc();
  }

  recordBridgeRollupTxNum(rollupTxs: number, bridgeId: bigint) {
    this.bridgeRollupTxs.labels(BridgeId.fromBigInt(bridgeId).toString()).set(rollupTxs);
  }

  recordBridgeRollupGas(gas: number, bridgeId: bigint) {
    this.bridgeRollupGas.labels(BridgeId.fromBigInt(bridgeId).toString()).set(gas);
  }

  async rollupReceived(rollup: RollupDao) {
    const status = this.blockchain.getBlockchainStatus();
    for (const assetMetric of rollup.assetMetrics) {
      const assetId = assetMetric.assetId;
      const assetName = status.assets[assetId].symbol;
      const assetDecimals = status.assets[assetId].decimals;

      const contractBalance = +fromBaseUnits(assetMetric.contractBalance, assetDecimals);
      this.rollupContractBalance.labels(assetName).set(contractBalance);

      const totalDeposited = +fromBaseUnits(assetMetric.totalDeposited, assetDecimals);
      this.totalDeposited.labels(assetName).set(totalDeposited);

      const totalWithdrawn = +fromBaseUnits(assetMetric.totalWithdrawn, assetDecimals);
      this.totalWithdrawn.labels(assetName).set(totalWithdrawn);

      const totalDefiDeposited = +fromBaseUnits(assetMetric.totalDefiDeposited, assetDecimals);
      this.totalDefiDeposited.labels(assetName).set(totalDefiDeposited);

      const totalDefiClaimed = +fromBaseUnits(assetMetric.totalDefiClaimed, assetDecimals);
      this.totalDefiClaimed.labels(assetName).set(totalDefiClaimed);

      const totalFees = +fromBaseUnits(assetMetric.totalFees, assetDecimals);
      this.totalFees.labels(assetName).set(totalFees);

      const rollupBeneficiaryBalanceInt = await this.blockchain.getAsset(assetId).balanceOf(this.rollupBeneficiary);
      const rollupBeneficiaryBalance = +fromBaseUnits(rollupBeneficiaryBalanceInt, assetDecimals);
      this.feeDistributorContractBalance.labels(assetName).set(rollupBeneficiaryBalance);
    }

    if (rollup.bridgeMetrics) {
      for (const bridgeMetric of rollup.bridgeMetrics) {
        const { bridgeId: _bridgeId, numTxs } = bridgeMetric;
        const bridgeId = BridgeId.fromBigInt(_bridgeId).toString();

        this.bridgeTotalTxCounter.labels(bridgeId).inc(numTxs);
        this.bridgeTotalTimesCalledCounter.labels(bridgeId).inc();
      }
    }

    this.rollupSize.set(rollup.rollupProof.rollupSize);
    this.rollupTxs.set(rollup.rollupProof.txs.length);
    this.rollupGasUsed.set(rollup.gasUsed!);
    this.rollupGasPrice.set(Number(toBigIntBE(rollup.gasPrice!)));
  }

  // record transient bridge metrics
  public recordRollupMetrics(txs: RollupTx[], rollupProfile: RollupProfile, bridgeConfigs: BridgeConfig[]) {
    this.rollupTransactions.set(rollupProfile.totalTxs);
    this.rollupGasBalance.set(rollupProfile.gasBalance);

    const bridgeStats: Record<string, { txNum: number; gasAcc: number }> = {};
    for (const bp of rollupProfile.bridgeProfiles.values()) {
      const bridgeConfig = bridgeConfigs.find(({ bridgeId: configBridgeId }) => bp.bridgeId === configBridgeId);
      if (bridgeConfig) {
        this.recordBridgeRollupTxNum(bridgeConfig.numTxs, bp.bridgeId);
        this.recordBridgeRollupGas(bridgeConfig.gas, bp.bridgeId);
      }
      const strBridgeId = BridgeId.fromBigInt(bp.bridgeId).toString();
      if (bridgeStats[strBridgeId]) {
        bridgeStats[strBridgeId].txNum += bp.numTxs;
        bridgeStats[strBridgeId].gasAcc += bp.gasAccrued;
      } else {
        bridgeStats[strBridgeId] = {
          txNum: bp.numTxs,
          gasAcc: bp.gasAccrued,
        };
      }
    }

    for (const bridgeConfig of bridgeConfigs) {
      const strBridgeId = BridgeId.fromBigInt(bridgeConfig.bridgeId).toString();
      this.bridgeRollupTxGauge.labels(strBridgeId).set(bridgeStats[strBridgeId]?.txNum || 0);
      this.bridgeRollupGasAcc.labels(strBridgeId).set(bridgeStats[strBridgeId]?.gasAcc || 0);
    }
  }

  async rollupPublished(
    rollupProfile: RollupProfile,
    txs: TxDao[],
    rollupId: number,
    feeResolver: TxFeeResolver,
    bridgeResolver: BridgeResolver,
  ) {
    const result: BridgeMetricsDao[] = [];
    const ethUsdTicker = await this.coinbaseClient.getProductTicker('ETH-USD');
    const ethUsdPrice = Number(ethUsdTicker.price);
    const gasPrice = await this.blockchain.getGasPriceFeed().price();
    const status = this.blockchain.getBlockchainStatus();

    // calculate total fees made from each defi deposit tx
    const valueMappings: { [key: string]: { feeInWei: bigint; depositValue: bigint } } = {};
    for (const tx of txs.filter(tx => tx.txType === TxType.DEFI_DEPOSIT)) {
      const proofData = DefiDepositProofData.fromBuffer(tx.proofData);
      const strBridgeId = proofData.bridgeId.toString();
      const depositValue = proofData.defiDepositValue;
      const singleBridgeGas = feeResolver.getSingleBridgeTxGas(proofData.bridgeId.toBigInt()) + tx.excessGas;
      const fullBridgeGas = feeResolver.getFullBridgeGas(proofData.bridgeId.toBigInt());
      const gasTowardsBridge = Math.min(singleBridgeGas, fullBridgeGas);
      const feeInWei = feeResolver.getTxFeeFromGas(0, gasTowardsBridge);
      if (!valueMappings[strBridgeId]) {
        valueMappings[strBridgeId] = { depositValue, feeInWei };
      } else {
        valueMappings[strBridgeId].depositValue += depositValue;
        valueMappings[strBridgeId].feeInWei += feeInWei;
      }
    }

    const calcUsd = (num: number) => {
      return (num * Number(gasPrice / 10n ** 9n) * ethUsdPrice) / 10 ** 9;
    };

    const getDecimals = (bridgeId: BridgeId) => {
      if (bridgeId.inputAssetIdA < status.assets.length) {
        return status.assets[bridgeId.inputAssetIdA].decimals;
      }
      if (bridgeId.inputAssetIdB !== undefined && bridgeId.inputAssetIdB < status.assets.length) {
        return status.assets[bridgeId.inputAssetIdB].decimals;
      }
      return 0;
    };

    if (rollupProfile.bridgeProfiles.size) {
      for (const bridgeProfile of rollupProfile.bridgeProfiles.values()) {
        const { bridgeId, gasAccrued } = bridgeProfile;
        const bridgeCallData = BridgeId.fromBigInt(bridgeId);
        const assetDecimals = getDecimals(bridgeCallData);

        const strBridgeId = bridgeCallData.toString();
        const feeInWei = valueMappings[strBridgeId]?.feeInWei ?? 0n;
        const totalDeposit = valueMappings[strBridgeId]?.depositValue ?? 0n;

        const previous = await this.rollupDb.getLastBridgeMetrics(bridgeId);
        const bridgeMetrics = previous || new BridgeMetricsDao();
        bridgeMetrics.bridgeId = bridgeId;
        bridgeMetrics.rollupId = rollupId;
        bridgeMetrics.gas = BigInt(gasAccrued);
        bridgeMetrics.totalGas = BigInt(bridgeMetrics.totalGas + BigInt(bridgeProfile.gasThreshold));
        bridgeMetrics.totalAztecCalls = (bridgeMetrics.totalAztecCalls || 0) + 1;
        bridgeMetrics.gasPrice = gasPrice;

        const usdCostOfExecutingBridge = calcUsd(bridgeProfile.gasThreshold);
        const usdFees = (Number(feeInWei / 10n ** 9n) * ethUsdPrice) / 10 ** 9;

        bridgeMetrics.usdCost = usdCostOfExecutingBridge;
        bridgeMetrics.totalUsdCost = (bridgeMetrics.totalUsdCost || 0) + usdCostOfExecutingBridge;
        bridgeMetrics.usdFees = usdFees;
        bridgeMetrics.totalUsdFees = (bridgeMetrics.totalUsdFees || 0) + usdFees;
        bridgeMetrics.depositValue = totalDeposit;
        bridgeMetrics.totalDepositValue = (bridgeMetrics.totalDepositValue || 0n) + totalDeposit;
        result.push(bridgeMetrics);

        const bridgeLabel =
          bridgeResolver.getBridgeDescription(bridgeId) ||
          `${bridgeCallData.addressId} - ${bridgeCallData.inputAssetIdA} - ${bridgeCallData.auxData}`;
        this.bridgeRollupGasAcc.labels(bridgeLabel).set(gasAccrued);
        this.bridgeTotalGasAccCounter.labels(bridgeLabel).inc(gasAccrued);
        this.bridgeTotalAztecCallsCounter.labels(bridgeLabel).inc();
        this.bridgeRollupUsdCost.labels(bridgeLabel).set(usdCostOfExecutingBridge);
        this.bridgetotalUsdCost.labels(bridgeLabel).inc(usdCostOfExecutingBridge);
        this.bridgeRollupUsdFees.labels(bridgeLabel).set(usdFees);

        const totalDepositValue = +fromBaseUnits(totalDeposit, assetDecimals);
        this.rollupBridgeDepositValue.labels(bridgeLabel).set(totalDepositValue);
        this.totalBridgeDepositValue.labels(bridgeLabel).inc(totalDepositValue);

        this.bridgeTotalUsdFees.labels(bridgeLabel).inc(usdFees);
      }
      try {
        await this.rollupDb.addBridgeMetrics(result);
      } catch (err) {
        console.log('Error when adding bridge metrics to DB', err);
      }
    }
  }

  getMetrics() {
    return client.register.metrics();
  }
}
