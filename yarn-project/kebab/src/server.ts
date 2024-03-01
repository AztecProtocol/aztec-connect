import { EthereumRpc, RequestArguments } from '@aztec/barretenberg/blockchain';
import { InterruptableSleep, sleep } from '@aztec/barretenberg/sleep';
import { createLogger, createDebugLogger } from '@aztec/barretenberg/log';
import { getEarliestBlock, JsonRpcProvider } from '@aztec/blockchain';
import { EthLogsDb, EventStore, RollupLogsParamsQuery } from './log_db.js';
import { ConfVars } from './configurator.js';
import { default as JSONNormalize } from 'json-normalize';
import {
  ChainProperties,
  EventRetrieverErrors,
  extractEventErrorType,
  TopicEventRetriever,
} from './topic_event_retriever.js';
import { EVENT_PROPERTIES, REQUEST_TYPES_TO_CACHE } from './config.js';
import { EthEvent } from './eth_event.js';

export interface RollupLogsParams {
  topics: string[];
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  blockHash?: string;
}

export class Server {
  private ready = false;
  private eventRetrievers: TopicEventRetriever[] = [];
  private readonly checkFrequency = 5 * 1000;
  private running = false;
  private runningSyncPromise!: Promise<void>;
  private interruptableSleep = new InterruptableSleep();
  private cachedResponses: { [key: string]: Promise<any> | undefined } = {};
  private apiKeys: { [key: string]: boolean } = {};
  private provider: JsonRpcProvider;
  private ethereumRpc: EthereumRpc;
  private blockNumber = -1;
  private eventSyncedToBlockNumber = -1;
  private log = createLogger('Server');
  private debug = createDebugLogger('aztec:server');

  constructor(
    provider: JsonRpcProvider,
    ethereumHost: string,
    private logsDb: EthLogsDb,
    chainId: number,
    private readonly configuration: ConfVars,
  ) {
    this.provider = new JsonRpcProvider(ethereumHost);
    this.ethereumRpc = new EthereumRpc(this.provider);

    const { chunk, earliestBlock } = getEarliestBlock(chainId);
    this.eventRetrievers = EVENT_PROPERTIES.map(ep => {
      const chainProperties = {
        earliestBlock: earliestBlock,
        logBatchSize: chunk,
        rollupContractAddress: configuration.rollupContractAddress,
      } as ChainProperties;
      return new TopicEventRetriever(provider, logsDb, chainProperties, ep);
    });
    for (const key of this.configuration.apiKeys) {
      this.apiKeys[key] = true;
    }
  }

  public async start() {
    this.log('Server starting...');
    const { indexing } = this.configuration;

    this.running = true;
    this.blockNumber = await this.ethereumRpc.blockNumber();

    if (indexing) {
      let success = false;
      while (!success) {
        success = true;
        try {
          this.log(`Performing initial sync to block ${this.blockNumber}...`);
          // write the events directly to the DB stream by stream
          // we are not yet accepting client requests so no concern around consistency
          const results = await Promise.allSettled(
            this.eventRetrievers.map(x => x.syncToLatest(this.blockNumber, this.logsDb)),
          );
          for (const errorType of results.map(x => extractEventErrorType(x))) {
            if (errorType.type === EventRetrieverErrors.STREAM) {
              // problems with the stream need investigation, throw here to prevent startup
              throw new Error(errorType.message);
            } else if (errorType.type !== EventRetrieverErrors.NONE) {
              this.log(errorType.message);
              success = false;
            }
          }
        } catch (err) {
          this.log(err);
          this.log('Server not starting');
          return;
        }
        // if we did not successfully initialise then retry after a sleep
        if (!success) {
          this.log(`Failed initial sync, will retry again shortly...`);
          await sleep(this.checkFrequency);
        }
      }

      this.eventSyncedToBlockNumber = this.blockNumber;
    }
    this.ready = true;

    this.runningSyncPromise = (async () => {
      this.blockNumber = await this.ethereumRpc.blockNumber();

      while (this.running) {
        await this.interruptableSleep.sleep(this.checkFrequency);

        const newBlockNumber = await this.ethereumRpc.blockNumber().catch(() => this.blockNumber);
        if (this.blockNumber != newBlockNumber) {
          this.debug(`new block number ${newBlockNumber}, purging cache.`);
          this.cachedResponses = {};
          this.blockNumber = newBlockNumber;
        }

        // if we are still running, or there are requests queued, then we need to look for further blocks
        if (indexing && this.running) {
          const success = await this.retrieveNewEvents(newBlockNumber);
          if (!success) {
            this.log(`Stopping further event syncing`);
            this.ready = false;
            this.running = false;
            break;
          }
          this.eventSyncedToBlockNumber = newBlockNumber;
        }
      }
    })();

    this.log(`Server started, indexing: ${indexing}.`);
  }

  public async stop() {
    this.ready = false;
    this.running = false;
    this.interruptableSleep.interrupt();
    await this.runningSyncPromise;
    await this.logsDb.stop();
  }

  public isReady() {
    return this.ready;
  }

  public methodIsPermitted(method: string | undefined) {
    if (this.configuration.allowPrivilegedMethods) {
      return true;
    }
    if (method === undefined) {
      return false;
    }
    return method.startsWith('eth_') || this.configuration.additionalPermittedMethods.includes(method);
  }

  public isValidApiKey(keyProvided: string | undefined) {
    if (this.configuration.apiKeys.length === 0) {
      return true;
    }
    if (!keyProvided) {
      return false;
    }
    return !!this.apiKeys[keyProvided];
  }

  public async jsonRpc(args: RequestArguments) {
    const { method, params = [] } = args;
    if (
      this.configuration.indexing &&
      this.isReady() &&
      method?.startsWith('eth_getLogs') &&
      params[0].topics?.length &&
      this.topicIsIndexed(params[0].topics[0])
    ) {
      return await this.queryLogs(params[0]);
    } else {
      return await this.forwardEthRequest({ method, params });
    }
  }

  // PRIVATE METHODS:

  private async retrieveNewEvents(latestBlock: number) {
    try {
      // in order to ensure consistency between log streams we will have the event retrievers write to a local cache
      // then we will commit that complete cache atomically to the database
      const events: EthEvent[] = [];
      const eventStore = {
        addEthLogs: async (logs: EthEvent[]) => {
          events.push(...logs);
          await Promise.resolve();
        },
      } as EventStore;
      const results = await Promise.allSettled(this.eventRetrievers.map(x => x.syncToLatest(latestBlock, eventStore)));
      // if any of the syncs failed then don't write anything
      // we want to remain as consistent as possible
      let success = true;
      for (const errorType of results.map(x => extractEventErrorType(x))) {
        if (errorType.type === EventRetrieverErrors.STREAM) {
          // problems with the stream need investigation, throw here to prevent continuing
          throw new Error(errorType.message);
        } else if (errorType.type !== EventRetrieverErrors.NONE) {
          success = false;
        }
      }
      if (success) {
        await this.writeEventsToDB(events);
      }
    } catch (err) {
      this.log(err.message);
      return false;
    }
    return true;
  }

  private async writeEventsToDB(events: EthEvent[]) {
    if (!events.length) {
      return;
    }
    try {
      await this.logsDb.addEthLogs(events);
    } catch (err) {
      this.log(`Failed to write events to DB!`, err);
    }
  }

  private topicIsIndexed(topic: string) {
    return EVENT_PROPERTIES.map(x => x.mainTopic).includes(topic);
  }

  // querying for eth logs that may be in our DB
  private async queryLogs(params: RollupLogsParams) {
    const ourLatestBlock = this.eventSyncedToBlockNumber;
    const requestedStartBlock =
      !params.fromBlock || params.fromBlock === 'latest' ? ourLatestBlock : parseInt(params.fromBlock);
    const requestedEndBlock =
      !params.toBlock || params.toBlock === 'latest' ? ourLatestBlock : parseInt(params.toBlock);
    if (requestedEndBlock < requestedStartBlock) {
      return [];
    }

    const query = {
      topics: params.topics,
      address: params.address,
      fromBlock: requestedStartBlock,
      toBlock: requestedEndBlock,
    };
    return await this.getLogs(query);
  }

  private async getLogs(query: RollupLogsParamsQuery) {
    const result = await this.logsDb.queryEthLogs(query);
    return result || [];
  }

  private async forwardEthRequest(args: RequestArguments) {
    if (REQUEST_TYPES_TO_CACHE.includes(args.method)) {
      return await this.forwardEthRequestViaCache(args);
    }

    const result = await this.provider.request(args);

    // Imagine:
    // Alice makes a `call` request to check a bit of state. The result is cached.
    // Alice sends a transaction that modifies the state.
    // Alice requests a transaction receipt, which would be returned as success, implying the state has changed.
    // Alice performs another `call` to check the state change, but the cached result is returned. Bad.
    //
    // Any data stored in the cache will be *no older* than this.blockNumber.
    // They could be newer as the `call` request may populate the cache between a new block, and the poll discovering it.
    // This means there is data inconsistency spanning maybe two blocks, potentially for a few seconds.
    // This is certainly no worse then using something like Infra.
    //
    // We can remedy this case.
    // Here we filter any transaction receipts that would acknowledge state that is newer than what is in the cache.
    // This resolves the use case above.
    //
    // One may subsequently imagine:
    // Alice makes a `call` request to check a bit of state. The result is cached.
    // Bob sends a transaction that modifies the state.
    // Charlie makes a `call` request to check a bit of state. The stale cached result is returned.
    //
    // While this maybe considered an issue, the reality is this is *already* the case.
    // You can actually never assume that a value returned by a `call` that is shared, is not immediately stale.
    // The fact that Bob's transaction happened before Charlie's call, but Charlie experiences the state change after,
    // is irrelevant.
    if (args.method == 'eth_getTransactionReceipt' && result?.blockNumber > this.blockNumber) {
      this.debug(`discarding transaction receipt result until cache cleared.`);
      return null;
    }

    return result;
  }

  /**
   * Normalises the JSON (orders properties) to produce a consistent cache key.
   * If there's no entry, kick off a request and store the promise in the cache.
   * If there's an entry in the cache, await the result and return it.
   */
  private async forwardEthRequestViaCache(args: RequestArguments) {
    const cacheKey = JSONNormalize.sha256Sync(args);
    const cacheResult = this.cachedResponses[cacheKey];

    if (cacheResult === undefined) {
      this.cachedResponses[cacheKey] = new Promise((resolve, reject) => {
        this.debug(`cache key ${cacheKey} miss, adding response for request: ${JSON.stringify(args)}`);
        this.provider.request(args).then(resolve).catch(reject);
      });
      return await this.cachedResponses[cacheKey];
    } else {
      this.debug(`cache key ${cacheKey} hit for request: ${JSON.stringify(args)}`);
      return await cacheResult;
    }
  }
}
