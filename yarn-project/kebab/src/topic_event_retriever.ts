import { EthAddress } from '@aztec/barretenberg/address';
import { createDebugLogger, createLogger } from '@aztec/barretenberg/log';
import { JsonRpcProvider } from '@aztec/blockchain';
import { EthLogsDb, EventStore } from './log_db.js';
import { EthEvent } from './eth_event.js';

export enum EventRetrieverErrors {
  NONE,
  PROVIDER, //An error with the ethereum provider, usually temporary, system should 'retry again later'
  STREAM, //An error in the data stream, difficult to 'fix', system will stop syncing and need investigation
  DB, // An error with a DB operation, system should retry later
}

export class EventRetrieverError extends Error {
  constructor(public type: EventRetrieverErrors, message: string) {
    super(message);
  }
}

export function extractEventErrorType(promiseResult: PromiseSettledResult<void>) {
  if (promiseResult.status === 'fulfilled') {
    return new EventRetrieverError(EventRetrieverErrors.NONE, '');
  }
  const error = promiseResult.reason as EventRetrieverError;
  return error;
}

function throwError(type: EventRetrieverErrors, message: string) {
  throw new EventRetrieverError(type, message);
}

export interface EventProperties {
  mainTopic: string;
  name: string;
  sequenceValidator?: (previous: EthEvent | undefined, newEvents: EthEvent[]) => { success: boolean; message: string };
}

export interface ChainProperties {
  rollupContractAddress: EthAddress;
  earliestBlock: number;
  logBatchSize: number;
}

export class TopicEventRetriever {
  private debug = createDebugLogger('aztec:topic_event_retriever');
  private log = createLogger('TopicEventRetriever');

  constructor(
    private provider: JsonRpcProvider,
    private logsDb: EthLogsDb,
    private chainProperties: ChainProperties,
    public eventProprties: EventProperties,
  ) {}

  public async syncToLatest(latestBlock: number, eventStore: EventStore) {
    const lastEvent = await this.getLastEventFromDB();
    return await this.retrieveNewEvents(lastEvent, latestBlock, eventStore);
  }

  public async retrieveNewEvents(lastEvent: EthEvent | undefined, toBlock: number, eventStore: EventStore) {
    // start the scan from the last known event's block number + 1, or the earliest block if not available
    const initialStart = Math.max(
      lastEvent ? Number(lastEvent.blockNumber) + 1 : 0,
      this.chainProperties.earliestBlock,
    );
    let start = initialStart;
    // cap the end block at the given 'to' block, otherwise scan for all the events we can for this chain
    let end = Math.min(start + this.chainProperties.logBatchSize - 1, toBlock);
    let lastQueriedEthBlock = -1;
    const totalStartTime = new Date().getTime();
    let totalEventCount = 0;
    let previousEvent = lastEvent;

    // provided start does not go past 'to' block, keep scanning
    while (start <= toBlock) {
      const receivedEvents = await this.makeLogRequest(this.eventProprties.mainTopic, start, end);
      lastQueriedEthBlock = end;
      start = end + 1;
      end = Math.min(start + this.chainProperties.logBatchSize - 1, toBlock);
      totalEventCount += receivedEvents.length;

      if (!receivedEvents.length) {
        // nothing received try the next batch
        continue;
      }

      // if we have a sequence validator then execute it for this batch of events
      if (this.eventProprties.sequenceValidator !== undefined) {
        const validation = this.eventProprties.sequenceValidator(previousEvent, receivedEvents);
        if (!validation.success) {
          // stream is broken, exit here
          this.log(`ERROR: sequence of events for ${this.eventProprties.name} broken!!`);
          throwError(EventRetrieverErrors.STREAM, validation.message);
        }
      }
      // grab the last event as the new 'previous'
      previousEvent = receivedEvents[receivedEvents.length - 1];
      // store the events in the given event store
      await this.writeEventsToEventStore(receivedEvents, eventStore);
    }

    const timeTaken = new Date().getTime() - totalStartTime;
    const logger = totalEventCount === 0 ? this.debug : this.log;
    logger(
      `Synced event ${this.eventProprties.name}, last at ${
        lastEvent ? Number(lastEvent.blockNumber) : 'N/A'
      }, ${initialStart} -> ${lastQueriedEthBlock == -1 ? 'N/A' : lastQueriedEthBlock} found ${totalEventCount} in ${
        timeTaken / 1000
      }s, now at ${totalEventCount === 0 ? 'N/A' : Number(previousEvent?.blockNumber)}`,
    );
  }

  private async makeLogRequest(topic: string, from: number, to: number) {
    const param = {
      address: this.chainProperties.rollupContractAddress.toString(),
      topics: [topic],
      fromBlock: `0x${from.toString(16)}`,
      toBlock: `0x${to.toString(16)}`,
    };
    try {
      return await this.provider.request({
        method: 'eth_getLogs',
        params: [param],
      });
    } catch (err) {
      throwError(EventRetrieverErrors.PROVIDER, err);
    }
  }

  private async getLastEventFromDB() {
    try {
      return await this.logsDb.getLastEvent(this.eventProprties.mainTopic);
    } catch (err) {
      throwError(EventRetrieverErrors.DB, err);
    }
  }

  private async writeEventsToEventStore(events: EthEvent[], store: EventStore) {
    try {
      await store.addEthLogs(events);
    } catch (err) {
      throwError(EventRetrieverErrors.DB, err);
    }
  }
}
