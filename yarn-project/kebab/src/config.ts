import { ConnectionOptions } from 'typeorm';
import { JsonRpcProvider } from '@aztec/blockchain';

import { Configurator } from './configurator.js';
import { EthEventDao } from './entity/eth_event.js';
import { EventProperties } from './topic_event_retriever.js';
import { EthEvent } from './eth_event.js';

/**
 * Do not cache eth_getTransactionReceipt without careful consideration of how it impacts consistency.
 * Discussed in forwardEthRequest.
 */
export const REQUEST_TYPES_TO_CACHE = [
  'eth_chainId',
  'eth_call',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_estimateGas',
  'eth_blockNumber',
];

export const ROLLUP_PROCESSED_EVENT_TOPIC = '0x14054a15b39bfd65ec00fc6d15c7e5f9cbc1dc6f452cbefa359b4da61ad89fb6';
export const DEFI_BRIDGE_EVENT_TOPIC = '0x692cf5822a02f5edf084dc7249b3a06293621e069f11975ed70908ed10ed2e2c';
export const OFFCHAIN_EVENT_TOPIC = '0xb92710e3fad9222f817fcd828bd1ce3612ad0cd1c8bd5f3a3f4b8d85c4444621';

const rollupSequenceValidation = (prev: EthEvent | undefined, newEvents: EthEvent[]) => {
  let current = prev;
  for (let i = 0; i < newEvents.length; i++) {
    const currentRollupNumber = current === undefined ? -1 : Number(current.topics[1]);
    const currentBlockNumber = current === undefined ? undefined : Number(current.blockNumber);
    const nextRollupNumber = Number(newEvents[i].topics[1]);
    const nextBlockNumber = Number(newEvents[i].blockNumber);
    if (nextRollupNumber !== currentRollupNumber + 1) {
      return {
        success: false,
        message: `Missing rollup event! Current ${currentRollupNumber} at block ${
          currentBlockNumber ?? 'N/A'
        }, next ${nextRollupNumber} at block ${nextBlockNumber}`,
      };
    }
    current = newEvents[i];
  }
  return {
    success: true,
    message: '',
  };
};

export const EVENT_PROPERTIES: EventProperties[] = [
  {
    mainTopic: ROLLUP_PROCESSED_EVENT_TOPIC,
    name: 'Rollup Processed Event',
    sequenceValidator: rollupSequenceValidation,
  },
  {
    mainTopic: DEFI_BRIDGE_EVENT_TOPIC,
    name: 'Defi Event',
    sequenceValidator: undefined,
  },
  {
    mainTopic: OFFCHAIN_EVENT_TOPIC,
    name: 'Off Chain Event',
    sequenceValidator: undefined,
  },
];

async function getProvider(ethereumHost: string) {
  const provider = new JsonRpcProvider(ethereumHost, true);

  const chainId = parseInt(
    await provider.request({
      method: 'eth_chainId',
    }),
  );

  return { provider, chainId };
}

export function getOrmConfig(logging = false): ConnectionOptions {
  const entities = [EthEventDao];
  return {
    type: 'sqlite',
    database: 'data/db.sqlite',
    entities,
    synchronize: true,
    logging,
  };
}

export async function getComponents(configurator: Configurator) {
  const confVars = configurator.getConfVars();

  const { ethereumHost, typeOrmLogging } = confVars;
  const { provider, chainId } = await getProvider(ethereumHost);
  const ormConfig = getOrmConfig(typeOrmLogging);

  console.log(`Process Id: ${process.pid}`);
  console.log(`Ethereum host: ${ethereumHost}`);

  return { ormConfig, provider, chainId };
}
