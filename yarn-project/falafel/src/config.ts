import { EthereumRpc } from '@aztec/barretenberg/blockchain';
import { EthereumBlockchainConfig, JsonRpcProvider, WalletProvider } from '@aztec/blockchain';
import { ConnectionOptions } from 'typeorm';
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

export function getOrmConfig(dbUrl?: string, logging = false): ConnectionOptions {
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
  const ormConfig = getOrmConfig(dbUrl, typeOrmLogging);
  const { provider, signingAddress } = await getProvider(ethereumHost, privateKey);
  const ethConfig = getEthereumBlockchainConfig(confVars);

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

  return { ormConfig, provider, signingAddress, ethConfig };
}
