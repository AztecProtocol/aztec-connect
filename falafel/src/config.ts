import { EthereumBlockchainConfig, EthersAdapter, WalletProvider } from 'blockchain';
import { randomBytes } from 'crypto';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';
import { dirname } from 'path';
import { JsonRpcProvider, InfuraProvider } from '@ethersproject/providers';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { ConnectionOptions } from 'typeorm';

interface ConfVars {
  port: number;
  rollupContractAddress?: string;
  ethereumHost?: string;
  infuraApiKey?: string;
  network?: string;
  privateKey?: Buffer;
  innerRollupSize: number;
  outerRollupSize: number;
  publishInterval: number;
  minConfirmation: number;
  minConfirmationEHW: number;
  gasLimit?: number;
  apiPrefix: string;
  serverAuthToken: string;
  localBlockchainInitSize?: number;
  // Temporary blockchain constants
  txFee: bigint;
  feeLimit: bigint;
}

function getConfVars(): ConfVars {
  const {
    ROLLUP_CONTRACT_ADDRESS,
    ETHEREUM_HOST,
    INFURA_API_KEY,
    NETWORK,
    PRIVATE_KEY,
    PORT,
    INNER_ROLLUP_SIZE,
    OUTER_ROLLUP_SIZE,
    PUBLISH_INTERVAL,
    MIN_CONFIRMATION,
    MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
    LOCAL_BLOCKCHAIN_INIT_SIZE,
    API_PREFIX,
    GAS_LIMIT,
    SERVER_AUTH_TOKEN,
    TX_FEE,
    FEE_LIMIT,
  } = process.env;

  return {
    port: +(PORT || 8081),
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS,
    ethereumHost: ETHEREUM_HOST,
    infuraApiKey: INFURA_API_KEY,
    network: NETWORK,
    privateKey: PRIVATE_KEY ? Buffer.from(PRIVATE_KEY.slice(2), 'hex') : undefined,
    innerRollupSize: +(INNER_ROLLUP_SIZE || 1),
    outerRollupSize: +(OUTER_ROLLUP_SIZE || 2),
    publishInterval: +(PUBLISH_INTERVAL || 0),
    minConfirmation: +(MIN_CONFIRMATION || 1),
    minConfirmationEHW: +(MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW || 12),
    gasLimit: GAS_LIMIT ? +GAS_LIMIT : undefined,
    apiPrefix: API_PREFIX || '',
    serverAuthToken: SERVER_AUTH_TOKEN || randomBytes(32).toString('hex'),
    localBlockchainInitSize: LOCAL_BLOCKCHAIN_INIT_SIZE ? +LOCAL_BLOCKCHAIN_INIT_SIZE : undefined,
    txFee: BigInt(TX_FEE || 0),
    feeLimit: FEE_LIMIT ? BigInt(FEE_LIMIT) : BigInt(10) ** BigInt(30),
  };
}

function getEthereumBlockchainConfig({
  gasLimit,
  minConfirmation,
  minConfirmationEHW,
  network,
  ethereumHost,
  txFee,
}: ConfVars): EthereumBlockchainConfig {
  return {
    networkOrHost: network || ethereumHost || 'local',
    gasLimit,
    minConfirmation,
    minConfirmationEHW,
    txFee,
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
  const provider = getBaseProvider(confVars);
  if (!provider) {
    throw new Error('Provider is undefined.');
  }

  if (privateKey) {
    const walletProvider = new WalletProvider(provider);
    const signingAddress = walletProvider.addAccount(privateKey);
    console.log(`Signing address: ${signingAddress}`);
    return walletProvider;
  }

  return provider;
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
    // Remove all bigint values for now. fs-extra can't process bigint (#765) but will be able to do so in the next majoy release (10.0).
    // https://github.com/jprichardson/node-fs-extra/issues/846
    txFee: undefined,
    feeLimit: undefined,
  });

  return state;
}

function getOrmConfig(): ConnectionOptions {
  return {
    type: 'sqlite',
    database: 'data/db.sqlite',
    entities: [TxDao, RollupProofDao, RollupDao],
    synchronize: true,
    logging: false,
  };
}

export async function getConfig() {
  const ormConfig = getOrmConfig();
  const confVars = await loadConfVars('./data/config');
  const { gasLimit, rollupContractAddress } = confVars;

  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);

  return { confVars, ormConfig, provider: getProvider(confVars), ethConfig: getEthereumBlockchainConfig(confVars) };
}
