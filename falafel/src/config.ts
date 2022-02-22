import { EthereumBlockchainConfig, EthersAdapter, WalletProvider } from '@aztec/blockchain';
import { BridgeId, BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { JsonRpcProvider } from '@ethersproject/providers';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { ConnectionOptions } from 'typeorm';
import { AccountDao } from './entity/account';
import { ClaimDao } from './entity/claim';
import { AssetMetricsDao } from './entity/asset_metrics';
import { Configurator, ConfVars } from './configurator';

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
  const ethersProvider = new JsonRpcProvider(ethereumHost);
  const chainId = (await ethersProvider.getNetwork()).chainId;
  const baseProvider = new EthersAdapter(ethersProvider);
  const provider = new WalletProvider(baseProvider);
  const signingAddress = provider.addAccount(privateKey);
  return { provider, signingAddress, chainId };
}

function getOrmConfig(dbUrl?: string, logging = false): ConnectionOptions {
  const entities = [TxDao, RollupProofDao, RollupDao, AccountDao, ClaimDao, AssetMetricsDao];
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

function getPerChainBridgeConfig(chainId: number) {
  const perChainBridgeConfig: { [key: string]: any[] } = {
    '1': [],
    '1337': [
      {
        bridgeId: '0x0000000000000000000000000000000000000000000000004000000000000001',
        numTxs: 10,
        fee: 100000,
        rollupFrequency: 2,
      },
      {
        bridgeId: '0x0000000000000000000000000000000000000000000000000000000100000002',
        numTxs: 10,
        fee: 100000,
        rollupFrequency: 2,
      },
    ],
  };

  const config = perChainBridgeConfig[chainId];
  if (!config?.length) {
    return [];
  }
  return config.map(c => {
    const bc: BridgeConfig = {
      bridgeId: BridgeId.fromString(c.bridgeId).toBigInt(),
      numTxs: c.numTxs,
      fee: BigInt(c.fee),
      rollupFrequency: c.rollupFrequency,
    };
    return bc;
  });
}

export async function getConfig() {
  const configurator = new Configurator();
  await configurator.init();

  const confVars = configurator.getConfVars();
  const {
    runtimeConfig: { gasLimit },
    ethereumHost,
    privateKey,
    rollupContractAddress,
    typeOrmLogging,
    dbUrl,
    proverless,
  } = confVars;

  const ormConfig = getOrmConfig(dbUrl, typeOrmLogging);
  const { provider, signingAddress, chainId } = await getProvider(ethereumHost, privateKey);
  const ethConfig = getEthereumBlockchainConfig(confVars);
  const bridgeConfigs = getPerChainBridgeConfig(chainId);

  console.log(`Database Url: ${dbUrl || 'none (local sqlite)'}`);
  console.log(`Ethereum host: ${ethereumHost}`);
  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);
  console.log(`Signing address: ${signingAddress}`);
  console.log(`Proverless: ${proverless}`);

  return { configurator, ormConfig, provider, signingAddress, ethConfig, bridgeConfigs };
}
