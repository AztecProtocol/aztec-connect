import { EthereumBlockchainConfig, EthersAdapter, WalletProvider } from '@aztec/blockchain';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';
import { dirname } from 'path';
import { JsonRpcProvider, InfuraProvider } from '@ethersproject/providers';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { ConnectionOptions } from 'typeorm';
import { AccountDao } from './entity/account';
import { ClaimDao } from './entity/claim';
import { AssetMetricsDao } from './entity/asset_metrics';

interface ConfVars {
  port: number;
  rollupContractAddress?: string;
  priceFeedContractAddresses: string[];
  ethereumHost?: string;
  ethereumPollInterval?: number;
  halloumiHost?: string;
  infuraApiKey?: string;
  network?: string;
  privateKey: Buffer;
  numInnerRollupTxs: number;
  numOuterRollupProofs: number;
  publishInterval: number;
  minConfirmation: number;
  minConfirmationEHW: number;
  gasLimit?: number;
  apiPrefix: string;
  serverAuthToken: string;
  baseTxGas: number;
  maxFeeGasPrice: bigint;
  feeGasPriceMultiplier: number;
  maxProviderGasPrice: bigint;
  providerGasPriceMultiplier: number;
  reimbursementFeeLimit: bigint;
  maxUnsettledTxs: number;
  typeOrmLogging: boolean;
}

function getConfVars(): ConfVars {
  const {
    ROLLUP_CONTRACT_ADDRESS,
    PRICE_FEED_CONTRACT_ADDRESSES,
    ETHEREUM_HOST,
    ETHEREUM_POLL_INTERVAL,
    HALLOUMI_HOST,
    INFURA_API_KEY,
    NETWORK,
    PRIVATE_KEY,
    PORT,
    NUM_INNER_ROLLUP_TXS,
    NUM_OUTER_ROLLUP_PROOFS,
    PUBLISH_INTERVAL,
    MIN_CONFIRMATION,
    MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
    API_PREFIX,
    GAS_LIMIT,
    SERVER_AUTH_TOKEN,
    BASE_TX_GAS,
    MAX_FEE_GAS_PRICE,
    REIMBURSEMENT_FEE_LIMIT,
    FEE_GAS_PRICE_MULTIPLIER,
    MAX_PROVIDER_GAS_PRICE,
    PROVIDER_GAS_PRICE_MULTIPLIER,
    MAX_UNSETTLED_TXS,
    TYPEORM_LOGGING,
  } = process.env;

  return {
    port: +(PORT || 8081),
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS,
    priceFeedContractAddresses: (PRICE_FEED_CONTRACT_ADDRESSES || '').split(','),
    ethereumHost: ETHEREUM_HOST,
    ethereumPollInterval: +(ETHEREUM_POLL_INTERVAL || 10000),
    halloumiHost: HALLOUMI_HOST,
    infuraApiKey: INFURA_API_KEY,
    network: NETWORK,
    privateKey: PRIVATE_KEY
      ? Buffer.from(PRIVATE_KEY.slice(2), 'hex')
      : // Test mnemonic account 0.
        Buffer.from('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'hex'),
    numInnerRollupTxs: +(NUM_INNER_ROLLUP_TXS || 1),
    numOuterRollupProofs: +(NUM_OUTER_ROLLUP_PROOFS || 1),
    publishInterval: +(PUBLISH_INTERVAL || 0),
    minConfirmation: +(MIN_CONFIRMATION || 1),
    minConfirmationEHW: +(MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW || 12),
    gasLimit: GAS_LIMIT ? +GAS_LIMIT : undefined,
    apiPrefix: API_PREFIX || '',
    serverAuthToken: SERVER_AUTH_TOKEN || '!changeme#',
    baseTxGas: +(BASE_TX_GAS || 0),
    maxFeeGasPrice: BigInt(MAX_FEE_GAS_PRICE || 0),
    feeGasPriceMultiplier: +(FEE_GAS_PRICE_MULTIPLIER || 1),
    maxProviderGasPrice: BigInt(MAX_PROVIDER_GAS_PRICE || 0),
    providerGasPriceMultiplier: +(PROVIDER_GAS_PRICE_MULTIPLIER || 1),
    reimbursementFeeLimit: REIMBURSEMENT_FEE_LIMIT ? BigInt(REIMBURSEMENT_FEE_LIMIT) : BigInt(10) ** BigInt(30),
    maxUnsettledTxs: +(MAX_UNSETTLED_TXS || 0),
    typeOrmLogging: !!TYPEORM_LOGGING,
  };
}

function getEthereumBlockchainConfig({
  gasLimit,
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

function getBaseProvider({ infuraApiKey, network, ethereumHost }: ConfVars) {
  if (infuraApiKey && network) {
    console.log(`Infura network: ${network}`);
    return new EthersAdapter(new InfuraProvider(network, infuraApiKey));
  } else if (ethereumHost) {
    console.log(`Ethereum host: ${ethereumHost}`);
    return new EthersAdapter(new JsonRpcProvider(ethereumHost));
  }
}

function getProvider(confVars: ConfVars) {
  const { privateKey } = confVars;
  const baseProvider = getBaseProvider(confVars);
  if (!baseProvider) {
    throw new Error('Provider is undefined.');
  }

  const provider = new WalletProvider(baseProvider);
  const signingAddress = provider.addAccount(privateKey);
  console.log(`Signing address: ${signingAddress}`);
  return { provider, signingAddress };
}

async function loadConfVars(path: string) {
  const dir = dirname(path);
  const state = getConfVars();

  if (!(await pathExists(path))) {
    await mkdirp(dir);
  } else {
    // Erase all data if rollup contract changes.
    const saved: ConfVars = await readJson(path);
    if (state.rollupContractAddress && state.rollupContractAddress !== saved.rollupContractAddress) {
      console.log(
        `Rollup contract changed, erasing data: ${saved.rollupContractAddress} -> ${state.rollupContractAddress}`,
      );
      await emptyDir(dir);
    }
  }

  // Save, redacting private key.
  await writeJson(path, {
    ...state,
    PRIVATE_KEY: undefined,
    // fs-extra can't process bigint (#765) but will be able to do so in the next major release (10.0).
    // https://github.com/jprichardson/node-fs-extra/issues/846
    reimbursementFeeLimit: state.reimbursementFeeLimit.toString(),
    maxFeeGasPrice: state.maxFeeGasPrice.toString(),
    maxProviderGasPrice: state.maxProviderGasPrice.toString(),
  });

  return state;
}

function getOrmConfig(logging: boolean): ConnectionOptions {
  return {
    type: 'sqlite',
    database: 'data/db.sqlite',
    entities: [TxDao, RollupProofDao, RollupDao, AccountDao, ClaimDao, AssetMetricsDao],
    synchronize: true,
    logging,
  };
}

export async function getConfig() {
  const confVars = await loadConfVars('./data/config');
  const { gasLimit, rollupContractAddress, typeOrmLogging } = confVars;

  const ormConfig = getOrmConfig(typeOrmLogging);

  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);

  return { confVars, ormConfig, ...getProvider(confVars), ethConfig: getEthereumBlockchainConfig(confVars) };
}
