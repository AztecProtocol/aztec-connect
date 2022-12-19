import { EthereumRpc, RequestArguments } from '@aztec/barretenberg/blockchain';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { createLogger, createDebugLogger } from '@aztec/barretenberg/log';
import { JsonRpcProvider } from '@aztec/blockchain';
import { EthLogsDb, RollupLogsParamsQuery } from './log_db.js';
import { DEFI_BRIDGE_EVENT_TOPIC, RollupEventGetter, ROLLUP_PROCESSED_EVENT_TOPIC } from './rollup_event_getter.js';
import { ConfVars } from './configurator.js';
import { default as JSONNormalize } from 'json-normalize';

/**
 * Do not cache eth_getTransactionReceipt without careful consideration of how it impacts consistency.
 * Discussed in forwardEthRequest.
 */
const REQUEST_TYPES_TO_CACHE = [
  'eth_chainId',
  'eth_call',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_estimateGas',
  'eth_blockNumber',
];

export interface RollupLogsParams {
  topics: string[];
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  blockHash?: string;
}

function isPromise(obj: any): obj is Promise<any> {
  return !!obj.then;
}

export class Server {
  private ready = false;
  private rollupEventGetter: RollupEventGetter;
  private readonly checkFrequency = 5 * 1000;
  private running = false;
  private runninSyncPromise!: Promise<void>;
  private interruptableSleep = new InterruptableSleep();
  private requestQueue: Array<() => void> = [];
  private cachedResponses: { [key: string]: any } = {};
  private apiKeys: { [key: string]: boolean } = {};
  private provider: JsonRpcProvider;
  private ethereumRpc: EthereumRpc;
  private blockNumber = -1;
  private log = createLogger('Server');
  private debug = createDebugLogger('server');

  constructor(
    provider: JsonRpcProvider,
    ethereumHost: string,
    private logsDb: EthLogsDb,
    chainId: number,
    private readonly configuration: ConfVars,
  ) {
    this.rollupEventGetter = new RollupEventGetter(
      this.configuration.redeployConfig.rollupContractAddress!,
      provider,
      chainId,
      logsDb,
    );
    for (const key of this.configuration.apiKeys) {
      this.apiKeys[key] = true;
    }

    this.provider = new JsonRpcProvider(ethereumHost);
    this.ethereumRpc = new EthereumRpc(this.provider);
  }

  private async retrieveMoreBlocks() {
    try {
      // take a copy of the outstanding requests queue and we will resolve them all after taking the latest chain state
      const outstandingRequests = this.requestQueue;
      this.requestQueue = [];
      await this.lookForBlocks();
      // any outstanding requests waiting for that last sync can now be fulfilled
      for (const request of outstandingRequests) {
        request();
      }
    } catch (err) {
      this.log('Error while looking for new rollup events: ', err.message);
    }
  }

  public getRedeployConfig() {
    return this.configuration.redeployConfig;
  }

  public async start() {
    this.log('Server starting...');
    const { indexing } = this.configuration;

    this.running = true;

    if (indexing) {
      this.log('Performing initial sync...');
      await this.rollupEventGetter.init();
    }
    this.ready = true;

    this.runninSyncPromise = (async () => {
      this.blockNumber = await this.ethereumRpc.blockNumber();

      while (this.running) {
        await this.interruptableSleep.sleep(this.checkFrequency);

        const newBlockNumber = await this.ethereumRpc.blockNumber();
        if (this.blockNumber != newBlockNumber) {
          this.debug(`new block number ${newBlockNumber}, purging cache.`);
          this.cachedResponses = {};
          this.blockNumber = newBlockNumber;
        }

        // if we are still running, or there are requests queued, then we need to look for further blocks
        if ((indexing && this.running) || this.requestQueue.length) {
          await this.retrieveMoreBlocks();
        }
      }
    })();

    this.log(`Server started, indexing: ${indexing}.`);
  }

  public async stop() {
    this.ready = false;
    this.running = false;
    this.interruptableSleep.interrupt();
    await this.runninSyncPromise;
  }

  public isReady() {
    return this.ready;
  }

  public allowPrivilegedMethods() {
    return this.configuration.allowPrivilegedMethods;
  }

  // Why are there not just privileged and unprivileged methods??
  public additionalPermittedMethods() {
    return this.configuration.additionalPermittedMethods;
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
      [ROLLUP_PROCESSED_EVENT_TOPIC, DEFI_BRIDGE_EVENT_TOPIC].includes(params[0].topics[0])
    ) {
      return await this.queryLogs(params[0]);
    } else {
      return await this.forwardEthRequest({ method, params });
    }
  }

  // PRIVATE METHODS:

  // querying for eth logs that may be in our DB
  private async queryLogs(params: RollupLogsParams) {
    const ourLatestBlock = this.rollupEventGetter.getLastQueriedBlockNum();
    const requestedStartBlock =
      !params.fromBlock || params.fromBlock === 'latest' ? ourLatestBlock : parseInt(params.fromBlock);
    const requestedEndBlock =
      !params.toBlock || params.toBlock === 'latest' ? ourLatestBlock : parseInt(params.toBlock);
    if (requestedEndBlock < requestedStartBlock) {
      return [];
    }

    if (requestedEndBlock <= ourLatestBlock) {
      const query = {
        topics: params.topics,
        address: params.address,
        fromBlock: requestedStartBlock,
        toBlock: requestedEndBlock,
      };
      return await this.getLogs(query);
    }

    // requested block is higher than our latest block, add a request to the outstanding queue and wait on it
    const requestPromise = new Promise<void>(resolve => {
      this.requestQueue.push(resolve);
    });
    this.log(`Client waiting for new blocks ${requestedStartBlock} -> ${requestedEndBlock}...`);
    await requestPromise;
    // a block sync has occured since we started our request. now fulfill the request as much as we can
    const newLatestBlock = this.rollupEventGetter.getLastQueriedBlockNum();
    const newRequestedEndBlock = requestedEndBlock > newLatestBlock ? newLatestBlock : requestedEndBlock;
    const query = {
      topics: params.topics,
      address: params.address,
      fromBlock: requestedStartBlock,
      toBlock: newRequestedEndBlock,
    };
    if (newRequestedEndBlock < requestedStartBlock) {
      return [];
    }
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
    // This is certainly no worse then using something like Infura.
    //
    // We can remedy this case.
    // Here we filter any transaction receipts that would acknowledge state that is newer than what is in the cache.
    // This resolves the use case above.
    //
    // The thoughtful engineer will subsequently imagine:
    // Alice makes a `call` request to check a bit of state. The result is cached.
    // Bob sends a transaction that modifies the state.
    // Charlie makes a `call` request to check a bit of state. The stale cached result is returned.
    //
    // While this maybe considered an issue, the reality is this is *already* the case.
    // You can actually never assume that a value returned by a `call` that is shared, is not immediately stale.
    // The fact that Bob's transaction happened before Charlie's call, but Charlie experiences the state change after,
    // is irrelevant.
    if (args.method == 'eth_getTransactionReceipt' && result.blockNumber > this.blockNumber) {
      this.debug(`discarding transaction receipt result until cache cleared.`);
      return null;
    }

    return result;
  }

  /**
   * Normalises the JSON (orders properties) to produce a consistent cache key.
   * If there's no entry, kick off a request and store the promise in the cache.
   * If there's a promise in the cache the request is in flight, await it.
   * If there's an entry in the cache, return it.
   */
  private async forwardEthRequestViaCache(args: RequestArguments) {
    const cacheKey = JSONNormalize.sha256Sync(args);
    const cacheResult = this.cachedResponses[cacheKey];

    if (cacheResult === undefined) {
      this.cachedResponses[cacheKey] = new Promise(resolve => {
        this.debug(`cache key ${cacheKey} miss, adding response for request: ${JSON.stringify(args)}`);
        void this.provider.request(args).then(resolve);
      });
      return this.cachedResponses[cacheKey];
    } else if (isPromise(cacheResult)) {
      this.debug(`cache key ${cacheKey} hit (in flight) for request: ${JSON.stringify(args)}`);
      return await cacheResult;
    } else {
      this.debug(`cache key ${cacheKey} hit for request: ${JSON.stringify(args)}`);
      return cacheResult;
    }
  }

  private async lookForBlocks(): Promise<void> {
    const latestEvents = await this.rollupEventGetter.getLatestRollupEvents();
    if (latestEvents.length && this.ready) {
      await this.logsDb.addEthLogs(latestEvents);
    }
  }
}
