import { ConnectionOptions } from 'typeorm';
import { JsonRpcProvider } from '@aztec/blockchain';

import { Configurator } from './configurator';
import { EthEventDao } from './entity/eth_event';

async function getProvider(ethereumHost: string) {
  const provider = new JsonRpcProvider(ethereumHost);

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
