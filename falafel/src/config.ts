import { EthereumBlockchainConfig, EthersAdapter, WalletProvider } from '@aztec/blockchain';
import { BridgeId, BridgeConfig, BitConfig } from '@aztec/barretenberg/bridge_id';
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

function generateBridgeId(id: number, inputAsset: number, outputAsset: number, aux: number) {
  return new BridgeId(id, inputAsset, outputAsset, 0, 0, BitConfig.EMPTY, aux);
}

function generateBridgeConfig(numTxs: number, fee: number, rollupFrequency: number, bridgeId: BridgeId) {
  const bridgeConfig = {
    bridgeId: bridgeId.toBigInt(),
    numTxs,
    fee,
    rollupFrequency,
  };
  return bridgeConfig;
}

function generateBridgeIds(numTxs: number, fee: number, rollupFrequency: number) {
  const uniswapBridge = 1;
  const elementBridge = 2;
  const elementAssetIds = [3, 4, 5, 6, 8, 9];
  const elementAuxDatas = new Map<number, Array<number>>([
    [3, [1643382476]],
    [4, [1643382446]],
    [5, [1651264326]],
    [6, [1643382514, 1650025565]],
    [8, [1643382460, 1651267340]],
    [9, [1644601070, 1651247155]],
  ]);
  return [
    generateBridgeConfig(numTxs, fee, rollupFrequency, generateBridgeId(uniswapBridge, 0, 1, 0)),
    generateBridgeConfig(numTxs, fee, rollupFrequency, generateBridgeId(uniswapBridge, 1, 0, 0)),
    ...elementAssetIds.flatMap(assetId => {
      const auxValues = elementAuxDatas.get(assetId);
      return auxValues === undefined
        ? []
        : auxValues.map(aux => {
            const generatedBridgeId = generateBridgeId(elementBridge, assetId, assetId, aux);
            return generateBridgeConfig(numTxs, fee, rollupFrequency, generatedBridgeId);
          });
    }),
  ];
}

function getPerChainBridgeConfig(chainId: number) {
  const perChainBridgeConfig: { [key: string]: any[] } = {
    1: [],
    1337: generateBridgeIds(10, 100000, 2),
    0xa57ec: generateBridgeIds(10, 1000000, 2),
  };

  const config = perChainBridgeConfig[chainId];
  if (!config?.length) {
    return [];
  }
  return config.map(c => {
    const bc: BridgeConfig = {
      bridgeId: c.bridgeId,
      numTxs: c.numTxs,
      fee: c.fee === undefined ? undefined : BigInt(c.fee),
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

  console.log(`Database Url: ${dbUrl || 'none (local sqlite)'}`);
  console.log(`Ethereum host: ${ethereumHost}`);
  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);
  console.log(`Fee distributor contract address: ${feeDistributorAddress || 'none'}`);
  console.log(`Signing address: ${signingAddress}`);
  console.log(`Proverless: ${proverless}`);

  if (feePayingAssetAddresses.length !== priceFeedContractAddresses.length) {
    throw new Error('There should be one price feed contract address per fee paying asset.');
  }

  return { configurator, ormConfig, provider, signingAddress, ethConfig, bridgeConfigs };
}
