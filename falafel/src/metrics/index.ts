import { AssetId, AssetIds } from '@aztec/barretenberg/asset';
import { Blockchain, TxType } from '@aztec/barretenberg/blockchain';
import { fromBaseUnits } from '@aztec/blockchain';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { toBigIntBE } from '@aztec/barretenberg/bigint_buffer';
import client, { Counter, Gauge, Histogram } from 'prom-client';
import { RollupDb } from '../rollup_db';

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
  private totalDeposited: Gauge<string>;
  private totalPendingDeposit: Gauge<string>;
  private totalWithdrawn: Gauge<string>;
  private totalFees: Gauge<string>;
  private feeDistributorBalance: Gauge<string>;

  private httpEndpointCounter: Counter<string>;
  private txReceivedCounter: Counter<string>;

  constructor(worldStateDb: WorldStateDb, private rollupDb: RollupDb, private blockchain: Blockchain) {
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
      async collect() {
        this.set(Number(await worldStateDb.getSize(0)));
      },
    });

    new Gauge({
      name: 'rollup_total',
      help: 'Total rollups',
      async collect() {
        this.set(await rollupDb.getNextRollupId());
      },
    });

    new Gauge({
      name: 'escapes_total',
      help: 'Total escapes',
      async collect() {
        this.set(await rollupDb.getTotalRollupsOfSize(0));
      },
    });

    this.rollupSize = new Gauge({
      name: 'rollup_size',
      help: 'Rollup size',
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
      name: 'rollup_contract_total_deposited',
      help: 'Total deposited',
      labelNames: ['symbol'],
    });

    this.totalPendingDeposit = new Gauge({
      name: 'rollup_contract_total_pending_deposit',
      help: 'Total pending deposit',
      labelNames: ['symbol'],
    });

    this.totalWithdrawn = new Gauge({
      name: 'rollup_contract_total_withdrawn',
      help: 'Total withdrawn',
      labelNames: ['symbol'],
    });

    this.totalFees = new Gauge({
      name: 'rollup_contract_total_fees',
      help: 'Total fees',
      labelNames: ['symbol'],
    });

    this.feeDistributorBalance = new Gauge({
      name: 'fee_contract_balance',
      help: 'Current balance on fee distributor contract',
      labelNames: ['symbol'],
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

  async getMetrics() {
    const status = await this.blockchain.getBlockchainStatus();
    for (const asset of AssetIds) {
      const totalDeposited = +fromBaseUnits(status.totalDeposited[asset], status.assets[asset].decimals);
      this.totalDeposited.labels(AssetId[asset].toString()).set(totalDeposited);

      const totalPendingDeposit = +fromBaseUnits(status.totalPendingDeposit[asset], status.assets[asset].decimals);
      this.totalPendingDeposit.labels(AssetId[asset].toString()).set(totalPendingDeposit);

      const totalWithdrawn = +fromBaseUnits(status.totalWithdrawn[asset], status.assets[asset].decimals);
      this.totalWithdrawn.labels(AssetId[asset].toString()).set(totalWithdrawn);

      const totalFees = +fromBaseUnits(status.totalFees[asset], status.assets[asset].decimals);
      this.totalFees.labels(AssetId[asset].toString()).set(totalFees);

      const feeDistributorBalance = +fromBaseUnits(status.feeDistributorBalance[asset], status.assets[asset].decimals);
      this.feeDistributorBalance.labels(AssetId[asset].toString()).set(feeDistributorBalance);
    }

    const rollup = await this.rollupDb.getLastSettledRollup();
    if (rollup) {
      this.rollupSize.set(rollup.rollupProof.rollupSize);
      this.rollupGasUsed.set(rollup.gasUsed!);
      this.rollupGasPrice.set(Number(toBigIntBE(rollup.gasPrice!)));
    }

    return client.register.metrics();
  }
}
