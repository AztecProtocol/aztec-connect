import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { BridgePublishQuery, BridgePublishQueryResult } from '@aztec/barretenberg/rollup_provider';
import { RollupDb } from '../rollup_db/rollup_db.js';
import { TxFeeResolver } from '../tx_fee_resolver/index.js';

const PERIOD_SECONDS = 86400 * 14; //  2 weeks

function checkField<T>(value: T | undefined) {
  return value === undefined ? '-' : `${value}`;
}

function getCacheKey(query: BridgePublishQuery) {
  return `${query.bridgeAddressId}/${checkField(query.inputAssetIdA)}/${checkField(query.outputAssetIdA)}/${checkField(
    query.inputAssetIdB,
  )}/${checkField(query.outputAssetIdB)}/${checkField(query.auxData)}`;
}
export class BridgeStatsQueryHandler {
  private bridgeQueryCache: { [key: string]: Promise<BridgePublishQueryResult> } = {};

  constructor(private rollupDb: RollupDb, private txFeeResolver: TxFeeResolver) {}

  async processBridgeQuery(query: BridgePublishQuery) {
    const queryKey = getCacheKey(query);
    const cacheResult = this.bridgeQueryCache[queryKey];
    if (cacheResult) {
      return await cacheResult;
    }

    const queryFn = async () => {
      const currentTime = Date.now();
      const queryThreshold = new Date(currentTime - PERIOD_SECONDS * 1000);

      const rollups = await this.rollupDb.getSettledRollupsAfterTime(queryThreshold);
      let totalGas = 0;
      const interactionTimes: Date[] = [];
      for (const rollup of rollups) {
        const bridgeCallDatas = RollupProofData.getBridgeCallDatas(rollup.rollupProof.encodedProofData);
        for (const bcd of bridgeCallDatas.map(x => BridgeCallData.fromBuffer(x))) {
          if (bcd.bridgeAddressId !== query.bridgeAddressId) {
            continue;
          }
          if (query.inputAssetIdA !== undefined && query.inputAssetIdA !== bcd.inputAssetIdA) {
            continue;
          }
          if (query.inputAssetIdB !== undefined && query.inputAssetIdB !== bcd.inputAssetIdB) {
            continue;
          }
          if (query.outputAssetIdA !== undefined && query.outputAssetIdA !== bcd.outputAssetIdA) {
            continue;
          }
          if (query.outputAssetIdB !== undefined && query.outputAssetIdB !== bcd.outputAssetIdB) {
            continue;
          }
          if (query.auxData !== undefined && query.auxData !== bcd.auxData) {
            continue;
          }
          let gasForBridge = 0;
          try {
            gasForBridge = this.txFeeResolver.getFullBridgeGas(bcd.toBigInt());
          } catch (error) {
            continue;
          }
          interactionTimes.push(rollup.mined!);
          if (interactionTimes.length === 1) {
            // only start the gas accumulation once we have at least 1 interaction
            continue;
          }
          totalGas += gasForBridge;
        }
      }

      // All these stats work on the basis that at least 2 interactions are needed to produce meaningful stats
      const totalTimePeriodMSeconds =
        interactionTimes.length < 2
          ? 0
          : interactionTimes[interactionTimes.length - 1].getTime() - interactionTimes[0].getTime();
      const totalTimePeriodSeconds = totalTimePeriodMSeconds / 1000;
      const totalTimePeriodHours = totalTimePeriodSeconds / (60 * 60);
      return {
        averageTimeout: interactionTimes.length < 2 ? 0 : totalTimePeriodSeconds / (interactionTimes.length - 1),
        averageGasPerHour: totalTimePeriodHours === 0 ? 0 : totalGas / totalTimePeriodHours,
        query,
      } as BridgePublishQueryResult;
    };

    this.bridgeQueryCache[queryKey] = queryFn();

    return await this.bridgeQueryCache[queryKey];
  }

  public onNewRollup() {
    // here we clear the cached results
    this.bridgeQueryCache = {};
  }
}
