import { EthereumRpc } from '@aztec/barretenberg/blockchain';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { WorldStateDb } from '@aztec/barretenberg/world_state_db';
import { EthereumBlockchain, EthereumBlockchainConfig, JsonRpcProvider, WalletProvider } from '@aztec/blockchain';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Configurator, ConfVars } from './configurator.js';
import {
  TxDao,
  RollupProofDao,
  RollupDao,
  ClaimDao,
  AssetMetricsDao,
  AccountDao,
  BridgeMetricsDao,
} from './entity/index.js';
import { CachedRollupDb, LogRollupDb, SyncRollupDb, TypeOrmRollupDb } from './rollup_db/index.js';

function getEthereumBlockchainConfig({
  runtimeConfig: { gasLimit },
  minConfirmation,
  minConfirmationEHW,
  ethereumPollInterval,
}: ConfVars): EthereumBlockchainConfig {
  return {
    gasLimit,
    minConfirmation,
    minConfirmationEHW,
    pollInterval: ethereumPollInterval,
  };
}

async function getProvider(ethereumHost: string, privateKey: Buffer) {
  const baseProvider = new JsonRpcProvider(ethereumHost, true);
  const ethereumRpc = new EthereumRpc(baseProvider);
  const chainId = await ethereumRpc.getChainId();
  const provider = new WalletProvider(baseProvider);
  const signingAddress = provider.addAccount(privateKey);
  return { provider, signingAddress, chainId };
}

export function getOrmConfig(dbUrl?: string, logging = false): DataSourceOptions {
  const entities = [TxDao, RollupProofDao, RollupDao, AccountDao, ClaimDao, AssetMetricsDao, BridgeMetricsDao];
  if (!dbUrl) {
    return {
      type: 'sqlite',
      database: 'data/db.sqlite',
      entities,
      synchronize: true,
      logging,
    };
  } else {
    const url = new URL(dbUrl);
    return {
      type: url.protocol.slice(0, -1) as any,
      host: url.hostname,
      port: +url.port,
      database: 'falafel',
      username: url.username,
      password: url.password,
      entities,
      synchronize: true,
      logging,
    };
  }
}

async function getRollupDb(dbUrl: string | undefined, dataRoot: Buffer, erase = false, logging = false) {
  const ormConfig = getOrmConfig(dbUrl, logging);
  const dataSource = new DataSource(ormConfig);
  await dataSource.initialize();

  const typeOrmRollupDb = new LogRollupDb(new TypeOrmRollupDb(dataSource, dataRoot), 'log_typeorm_rollup_db');

  if (erase) {
    console.log('Erasing sql database...');
    await typeOrmRollupDb.eraseDb();
  }

  // If we don't have a dbUrl we're sqlite, wrap in serialization layer to ensure no more than 1 request at a time.
  // const cachedRollupDb = new CachedRollupDb(
  //   dbUrl ? typeOrmRollupDb : new LogRollupDb(new SyncRollupDb(typeOrmRollupDb), 'log_sync_rollup_db'),
  // );

  // Keeping original behaviour of always having sync in place to try and diagnose.
  const syncRollupDb = new LogRollupDb(new SyncRollupDb(typeOrmRollupDb), 'log_sync_rollup_db');
  const rollupDb = new LogRollupDb(new CachedRollupDb(syncRollupDb), 'log_cached_rollup_db');
  await rollupDb.init();

  // We shouldn't have to be returning the dataSource here! This is again, because of graphql crap.
  // Remove once graphql is gone.
  return { rollupDb, dataSource };
}

export async function getComponents(configurator: Configurator) {
  const confVars = configurator.getConfVars();
  const {
    runtimeConfig: { gasLimit, feePayingAssetIds, rollupBeneficiary },
    ethereumHost,
    privateKey,
    rollupContractAddress,
    permitHelperContractAddress,
    priceFeedContractAddresses,
    bridgeDataProviderAddress,
    typeOrmLogging,
    dbUrl,
    proverless,
    rollupCallDataLimit,
    version,
  } = confVars;
  const { provider, signingAddress } = await getProvider(ethereumHost, privateKey);

  console.log(`Process Id: ${process.pid}`);
  console.log(`Database Url: ${dbUrl || 'none (local sqlite)'}`);
  console.log(`Ethereum host: ${ethereumHost}`);
  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Call data limit: ${rollupCallDataLimit}`);
  console.log(`Signing address: ${signingAddress}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);
  console.log(`Permit Helper contract address: ${permitHelperContractAddress || 'none'}`);
  console.log(`Rollup fee beneficiary: ${rollupBeneficiary || signingAddress}`);
  console.log(`Fee paying asset ids: ${feePayingAssetIds}`);
  console.log(`Price feed addresses: ${priceFeedContractAddresses.map(a => a.toString()).join(',') || 'none'}`);
  console.log(`Proverless: ${proverless}`);
  console.log(`Bridge data provider address: ${bridgeDataProviderAddress}`);
  console.log(`Falafel version: ${version}`);

  if (priceFeedContractAddresses.length < feePayingAssetIds.length) {
    throw new Error('There should be one price feed contract address per fee paying asset.');
  }

  // Create blockchain component.
  const ethConfig = getEthereumBlockchainConfig(confVars);
  const blockchain = await EthereumBlockchain.new(
    ethConfig,
    rollupContractAddress,
    permitHelperContractAddress,
    bridgeDataProviderAddress,
    priceFeedContractAddresses,
    provider,
  );
  const chainId = await blockchain.getChainId();

  const erase = configurator.getRollupContractChanged();

  // Create sql db component.
  const { dataRoot } = InitHelpers.getInitRoots(chainId);
  const { rollupDb, dataSource } = await getRollupDb(dbUrl, dataRoot, erase, typeOrmLogging);

  // Create world state db.
  const worldStateDb = new WorldStateDb();
  if (erase) {
    worldStateDb.destroy();
  }

  // Create barrtetenberg wasm instance.
  const barretenberg = await BarretenbergWasm.new();

  return { signingAddress, blockchain, rollupDb, worldStateDb, barretenberg, dataSource };
}
