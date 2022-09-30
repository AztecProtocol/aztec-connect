import { RequestArguments } from '@aztec/barretenberg/blockchain';
import { JsonRpcProvider } from '@aztec/blockchain';
import { InterruptableSleep } from '@aztec/barretenberg/sleep';
import { createLogger } from '@aztec/barretenberg/log';

import { EthLogsDb, RollupLogsParamsQuery } from './logDb';
import { RollupEventGetter } from './rollup_event_getter';
import { RedeployConfig } from './configurator';

export interface EthRequestArguments extends RequestArguments {
  jsonrpc: string;
  id: number;
}

export interface RollupLogsParams {
  topics: string[];
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  blockHash?: string;
}

export class Server {
  private ready = false;
  private rollupEventGetter: RollupEventGetter;
  private readonly checkFrequency = 5 * 1000;
  private running = false;
  private runninSyncPromise!: Promise<void>;
  private interruptableSleep = new InterruptableSleep();
  private requestQueue: Array<() => void> = [];

  private log = createLogger('Server');

  constructor(
    private provider: JsonRpcProvider,
    private logsDb: EthLogsDb,
    chainId: number,
    private readonly _allowPrivilegedMethods: boolean,
    private readonly redeployConfig: RedeployConfig,
  ) {
    this.rollupEventGetter = new RollupEventGetter(redeployConfig.rollupContractAddress!, provider, chainId, logsDb);
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
    return this.redeployConfig;
  }

  public async start() {
    // check sync status
    this.log('Server starting...');

    // init DB with existing blocks
    await this.init();

    // flip flag to start looking for new blocks
    this.running = true;

    this.runninSyncPromise = (async () => {
      while (this.running) {
        await this.interruptableSleep.sleep(this.checkFrequency);
        // if we are still running, or there are requests queued, then we need to look for further blocks
        if (this.running || this.requestQueue.length) {
          await this.retrieveMoreBlocks();
        }
      }
    })();
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

  public async lookForBlocks(): Promise<void> {
    const latestEvents = await this.rollupEventGetter.getLatestRollupEvents();
    if (latestEvents.length && this.ready) {
      await this.logsDb.addEthLogs(latestEvents);
    }
  }

  public async init() {
    // sync with blockchain
    await this.rollupEventGetter.init();
    this.log('Ready to receive requests...');
    this.ready = true;
  }

  // querying for eth logs that may be in our DB
  public async queryLogs(params: RollupLogsParams) {
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

  public async forwardEthRequest(args: EthRequestArguments) {
    return await this.provider.request(args);
  }

  public allowPrivilegedMethods() {
    return this._allowPrivilegedMethods;
  }
}
