import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { fromBaseUnits } from '@aztec/blockchain';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { EthAddress } from '@aztec/barretenberg/address';
import { PublicClient } from 'coinbase-pro';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { RollupDb } from '../rollup_db';
import { RollupProfile } from '../pipeline_coordinator/rollup_profiler';
import { TxDao, BridgeMetricsDao, RollupDao } from '../entity';
import { BridgeQueueStats } from '../pipeline_coordinator/bridge_tx_queue';
import { TxFeeResolver } from '../tx_fee_resolver';
import { DefiDepositProofData } from '@aztec/barretenberg/client_proofs/proof_data/defi_deposit_proof_data';
import { BridgeResolver } from '../bridge';

const BRIDGE_METRIC_LABEL = 'bridge_call_data';

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
  private bridgeRollupGasCost: Gauge<string>;

  private httpEndpointCounter: Counter<string>;
  private txReceivedCounter: Counter<string>;
  private bridgeTotalTxCounter: Counter<string>;
  private bridgeTotalGasAccCounter: Counter<string>;
  private bridgeTotalTimesCalledCounter: Counter<string>;
  private bridgeTotalAztecCallsCounter: Counter<string>;
  private bridgeTotalUsdCost: Counter<string>;
  private bridgeTotalUsdFees: Counter<string>;
  private bridgeTotalAztecTxCounter: Counter<string>;

  private coinbaseClient: PublicClient = new PublicClient();

  constructor(
    worldStateDb: WorldStateDb,
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    public rollupBeneficiary: EthAddress,
    private log = console.log,
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
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupGas = new Gauge({
      name: 'bridge_rollup_gas',
      help: 'Total gas in rollup for bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupGasAcc = new Gauge({
      name: 'bridge_gas_acc',
      help: 'Gas accumulated for bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupGasCost = new Gauge({
      name: 'bridge_rollup_gas_cost',
      help: 'gas cost of this bridge in rollup',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupUsdCost = new Gauge({
      name: 'bridge_rollup_usd_cost',
      help: 'USD cost of this bridge in rollup',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupUsdFees = new Gauge({
      name: 'bridge_rollup_usd_fees',
      help: 'USD Fees accrued by bridge in rollup',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeRollupTxGauge = new Gauge({
      name: 'bridge_rollup_tx',
      help: 'Bridge transactions received in rollup',
      labelNames: [BRIDGE_METRIC_LABEL],
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
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.totalBridgeDepositValue = new Gauge({
      name: 'total_bridge_deposit_value',
      help: 'Total Bridge Deposit Value',
      labelNames: [BRIDGE_METRIC_LABEL],
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
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalGasAccCounter = new Counter({
      name: 'bridge_total_gas_acc',
      help: 'Gas accumulated for bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalTimesCalledCounter = new Counter({
      name: 'bridge_total_times_called',
      help: 'Total times a bridge has been called',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalAztecCallsCounter = new Counter({
      name: 'bridge_total_aztec_times_called',
      help: 'Totaltimes a bridge has been called by Aztec rollups',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalUsdCost = new Counter({
      name: 'bridge_total_usd_cost',
      help: 'Total USD cost of bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalUsdFees = new Counter({
      name: 'bridge_total_usd_fees',
      help: 'Total USD fees accrued by bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
    });

    this.bridgeTotalAztecTxCounter = new Counter({
      name: 'bridge_total_aztec_txs',
      help: 'Total TXs published by aztec for bridge',
      labelNames: [BRIDGE_METRIC_LABEL],
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

  bridgeMetricLabelsToReset() {
    return [
      {
        name: 'bridge_gas_acc',
        gauge: this.bridgeRollupGasAcc,
      },
      {
        name: 'bridge_rollup_tx',
        gauge: this.bridgeRollupTxGauge,
      },
    ];
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
        // TODO: rename bridgeId to bridgeCallData
        const { bridgeId: _bridgeCallData, numTxs, publishedByProvider } = bridgeMetric;
        const bridgeCallData = BridgeCallData.fromBigInt(_bridgeCallData);
        const bridgeLabel = bridgeCallData.toString();

        this.bridgeRollupTxGauge.labels(bridgeLabel).set(numTxs || 0);
        this.bridgeTotalTxCounter.labels(bridgeLabel).inc(numTxs);
        this.bridgeTotalTimesCalledCounter.labels(bridgeLabel).inc();

        if (publishedByProvider) {
          this.bridgeTotalAztecTxCounter.labels(bridgeLabel).inc(numTxs);
        }
      }
    }

    this.rollupSize.set(rollup.rollupProof.rollupSize);
    this.rollupTxs.set(rollup.rollupProof.txs.length);
    this.rollupGasUsed.set(rollup.gasUsed!);
    this.rollupGasPrice.set(Number(toBigIntBE(rollup.gasPrice!)));
  }

  // record transient bridge metrics
  public async recordRollupMetrics(
    rollupProfile: RollupProfile,
    bridgeResolver: BridgeResolver,
    bridgeStats: BridgeQueueStats[],
  ) {
    this.rollupTransactions.set(rollupProfile.totalTxs);
    this.rollupGasBalance.set(rollupProfile.gasBalance);

    const usedBridgesLabels: string[] = [];

    const bridgeConfigs = bridgeResolver.getBridgeConfigs();

    // loop through bridge profiles (profitable bridges)
    for (const bp of rollupProfile.bridgeProfiles.values()) {
      const bridgeConfig = bridgeConfigs.find(
        ({ bridgeCallData: configBridgeCallData }) => bp.bridgeCallData === configBridgeCallData,
      );
      const bridgeCallData = BridgeCallData.fromBigInt(bp.bridgeCallData);
      const bridgeLabel = bridgeCallData.toString();
      if (bridgeConfig) {
        this.bridgeRollupTxs.labels(bridgeLabel).set(bridgeConfig.numTxs);
        this.bridgeRollupGas.labels(bridgeLabel).set(bridgeConfig.gas);
      }
      this.bridgeRollupTxGauge.labels(bridgeLabel).set(bp.numTxs || 0);
      this.bridgeRollupGasAcc.labels(bridgeLabel).set(bp.gasAccrued || 0);
      usedBridgesLabels.push(bridgeLabel);
    }

    // loop through all bridge stats
    for (const bs of bridgeStats) {
      // skip if bridge is included in rollupProfile.bridgeProfiles
      if (rollupProfile.bridgeProfiles.has(bs.bridgeCallData)) {
        continue;
      }
      const bridgeConfig = bridgeConfigs.find(
        ({ bridgeCallData: configBridgeCallData }) => bs.bridgeCallData === configBridgeCallData,
      );
      const bridgeCallData = BridgeCallData.fromBigInt(bs.bridgeCallData);
      const bridgeLabel = bridgeCallData.toString();
      if (bridgeConfig) {
        this.bridgeRollupTxs.labels(bridgeLabel).set(bridgeConfig.numTxs);
        this.bridgeRollupGas.labels(bridgeLabel).set(bridgeConfig.gas);
      }
      this.bridgeRollupTxGauge.labels(bridgeLabel).set(bs.numQueuedTxs || 0);
      this.bridgeRollupGasAcc.labels(bridgeLabel).set(bs.gasAccrued || 0);
      usedBridgesLabels.push(bridgeLabel);
    }

    // rollup metrics that weren't present in this rollup and need to be set to 0
    for (const metric of this.bridgeMetricLabelsToReset()) {
      // metrics are returned in format:
      // bridge_gas_acc{bridge_call_data="{BridgeCallData as hex string}"} <value>
      const regex = new RegExp(`(?!${metric.name}{${BRIDGE_METRIC_LABEL}=")(0x|0X)[a-fA-F0-9]{64}`, 'g');
      const metricValue = await client.register.getSingleMetricAsString(metric.name);
      const bridgeLabels = metricValue.match(regex) || [];
      for (const bridgeLabel of bridgeLabels) {
        if (!usedBridgesLabels.includes(bridgeLabel)) {
          metric.gauge.labels(bridgeLabel).set(0);
        }
      }
    }
  }

  async rollupPublished(rollupProfile: RollupProfile, txs: TxDao[], rollupId: number, feeResolver: TxFeeResolver) {
    const result: BridgeMetricsDao[] = [];
    const ethUsdTicker = await this.coinbaseClient.getProductTicker('ETH-USD');
    const ethUsdPrice = Number(ethUsdTicker.price);
    const gasPrice = await this.blockchain.getGasPriceFeed().price();
    const status = this.blockchain.getBlockchainStatus();

    // calculate total fees made from each defi deposit tx
    const valueMappings: { [key: string]: { feeInWei: bigint; depositValue: bigint } } = {};
    for (const tx of txs.filter(tx => tx.txType === TxType.DEFI_DEPOSIT)) {
      const proofData = DefiDepositProofData.fromBuffer(tx.proofData);
      const strBridgeCallData = proofData.bridgeCallData.toString();
      const depositValue = proofData.defiDepositValue;
      const singleBridgeGas = feeResolver.getSingleBridgeTxGas(proofData.bridgeCallData.toBigInt()) + tx.excessGas;
      const fullBridgeGas = feeResolver.getFullBridgeGas(proofData.bridgeCallData.toBigInt());
      const gasTowardsBridge = Math.min(singleBridgeGas, fullBridgeGas);
      const feeInWei = feeResolver.getTxFeeFromGas(0, gasTowardsBridge);
      if (!valueMappings[strBridgeCallData]) {
        valueMappings[strBridgeCallData] = { depositValue, feeInWei };
      } else {
        valueMappings[strBridgeCallData].depositValue += depositValue;
        valueMappings[strBridgeCallData].feeInWei += feeInWei;
      }
    }

    const calcUsd = (num: number) => {
      return (num * Number(gasPrice / 10n ** 9n) * ethUsdPrice) / 10 ** 9;
    };

    const getDecimals = (bridgeId: BridgeCallData) => {
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
        const { bridgeCallData: encodedBridgeCallData, gasAccrued } = bridgeProfile;
        const bridgeCallData = BridgeCallData.fromBigInt(encodedBridgeCallData);
        const assetDecimals = getDecimals(bridgeCallData);

        const strBridgeCallData = bridgeCallData.toString();
        const feeInWei = valueMappings[strBridgeCallData]?.feeInWei ?? 0n;
        const totalDeposit = valueMappings[strBridgeCallData]?.depositValue ?? 0n;

        const previous = await this.rollupDb.getOurLastBridgeMetrics(encodedBridgeCallData);
        const bridgeMetrics = previous || new BridgeMetricsDao();
        // TODO: rename bridgeId to bridgeCallData
        bridgeMetrics.bridgeId = encodedBridgeCallData;
        bridgeMetrics.rollupId = rollupId;
        bridgeMetrics.gas = BigInt(gasAccrued);
        bridgeMetrics.totalGasAccrued = BigInt(bridgeMetrics.totalGasAccrued || 0) + BigInt(bridgeMetrics.gas);
        bridgeMetrics.totalGas = BigInt(bridgeMetrics.totalGas || 0) + BigInt(bridgeProfile.gasThreshold);
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
        bridgeMetrics.publishedByProvider = true;
        result.push(bridgeMetrics);

        const bridgeLabel = bridgeCallData.toString();
        this.bridgeRollupGasAcc.labels(bridgeLabel).set(gasAccrued);
        this.bridgeTotalGasAccCounter.labels(bridgeLabel).inc(gasAccrued);
        this.bridgeTotalAztecCallsCounter.labels(bridgeLabel).inc();
        this.bridgeRollupGasCost.labels(bridgeLabel).set(bridgeProfile.gasThreshold);
        this.bridgeRollupUsdCost.labels(bridgeLabel).set(usdCostOfExecutingBridge);
        this.bridgeTotalUsdCost.labels(bridgeLabel).inc(usdCostOfExecutingBridge);
        this.bridgeRollupUsdFees.labels(bridgeLabel).set(usdFees);

        const totalDepositValue = +fromBaseUnits(totalDeposit, assetDecimals);
        this.rollupBridgeDepositValue.labels(bridgeLabel).set(totalDepositValue);
        this.totalBridgeDepositValue.labels(bridgeLabel).inc(totalDepositValue);

        this.bridgeTotalUsdFees.labels(bridgeLabel).inc(usdFees);
      }
      try {
        await this.rollupDb.addBridgeMetrics(result);
      } catch (err) {
        this.log('Metrics: Error when adding bridge metrics to DB', err);
      }
    }
  }

  getMetrics() {
    return client.register.metrics();
  }
}
