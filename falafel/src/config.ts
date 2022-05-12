import { EthereumRpc } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { BridgeConfig } from '@aztec/barretenberg/rollup_provider';
import { EthereumBlockchainConfig, JsonRpcProvider, WalletProvider } from '@aztec/blockchain';
import { ConnectionOptions } from 'typeorm';
import { Configurator, ConfVars } from './configurator';
import { AccountDao } from './entity/account';
import { AssetMetricsDao } from './entity/asset_metrics';
import { ClaimDao } from './entity/claim';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';

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
  const baseProvider = new JsonRpcProvider(ethereumHost);
  const ethereumRpc = new EthereumRpc(baseProvider);
  const chainId = await ethereumRpc.getChainId();
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

function getPerChainBridgeConfig(chainId: number): BridgeConfig[] {
  switch (chainId) {
    case 1:
    case 0xa57ec:
      return [
        {
          bridgeId: new BridgeId(1, 1, 1, undefined, undefined, 1663361092).toBigInt(),
          numTxs: 25,
          gas: 500000,
          rollupFrequency: 3,
        },
        {
          bridgeId: new BridgeId(2, 0, 2).toBigInt(),
          numTxs: 50,
          gas: 200000,
          rollupFrequency: 3,
        },
        {
          bridgeId: new BridgeId(2, 2, 0).toBigInt(),
          numTxs: 50,
          gas: 200000,
          rollupFrequency: 3,
        },
      ];
    default:
      return [];
  }
}

export async function getComponents(configurator: Configurator) {
  const confVars = configurator.getConfVars();
  const {
    runtimeConfig: { gasLimit },
    ethereumHost,
    privateKey,
    rollupContractAddress,
    feeDistributorAddress,
    feePayingAssetAddresses,
    priceFeedContractAddresses,
    typeOrmLogging,
    dbUrl,
    proverless,
  } = confVars;

  const ormConfig = getOrmConfig(dbUrl, typeOrmLogging);
  const { provider, signingAddress, chainId } = await getProvider(ethereumHost, privateKey);
  const ethConfig = getEthereumBlockchainConfig(confVars);
  const bridgeConfigs = getPerChainBridgeConfig(chainId);
  configurator.saveRuntimeConfig({ bridgeConfigs });

  console.log(`Database Url: ${dbUrl || 'none (local sqlite)'}`);
  console.log(`Ethereum host: ${ethereumHost}`);
  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup provider address: ${rollupContractAddress || 'none'}`);
  console.log(`Fee distributor address: ${feeDistributorAddress || 'none'}`);
  console.log(`Fee paying asset addresses: ${feePayingAssetAddresses.map(a => a.toString()).join(',') || 'none'}`);
  console.log(`Price feed addresses: ${priceFeedContractAddresses.map(a => a.toString()).join(',') || 'none'}`);
  console.log(`Signing address: ${signingAddress}`);
  console.log(`Proverless: ${proverless}`);

  if (feePayingAssetAddresses.length !== priceFeedContractAddresses.length) {
    throw new Error('There should be one price feed contract address per fee paying asset.');
  }

  return { ormConfig, provider, signingAddress, ethConfig };
}
