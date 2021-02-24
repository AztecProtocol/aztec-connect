import { EthereumBlockchainConfig, EthersAdapter, WalletProvider } from 'blockchain';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';
import { dirname } from 'path';
import { JsonRpcProvider, InfuraProvider } from '@ethersproject/providers';
import { RollupDao } from './entity/rollup';
import { RollupProofDao } from './entity/rollup_proof';
import { TxDao } from './entity/tx';
import { ConnectionOptions } from 'typeorm';
import { JoinSplitTxDao } from './entity/join_split_tx';
import { AccountTxDao } from './entity/account_tx';

interface ConfVars {
  port: number;
  rollupContractAddress?: string;
  ethereumHost?: string;
  halloumiHost: string;
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
  feeGasPrice: bigint;
  reimbursementFeeLimit: bigint;
  maxUnsettledTxs: number;
}

function getConfVars(): ConfVars {
  const {
    ROLLUP_CONTRACT_ADDRESS,
    ETHEREUM_HOST,
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
    FEE_GAS_PRICE,
    REIMBURSEMENT_FEE_LIMIT,
    MAX_UNSETTLED_TXS,
  } = process.env;

  return {
    port: +(PORT || 8081),
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS,
    ethereumHost: ETHEREUM_HOST,
    halloumiHost: HALLOUMI_HOST || 'http://localhost:8083',
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
    feeGasPrice: BigInt(FEE_GAS_PRICE || 0),
    reimbursementFeeLimit: REIMBURSEMENT_FEE_LIMIT ? BigInt(REIMBURSEMENT_FEE_LIMIT) : BigInt(10) ** BigInt(30),
    maxUnsettledTxs: +(MAX_UNSETTLED_TXS || 0),
  };
}

function getEthereumBlockchainConfig({
  gasLimit,
  minConfirmation,
  minConfirmationEHW,
}: ConfVars): EthereumBlockchainConfig {
  return {
    gasLimit,
    minConfirmation,
    minConfirmationEHW,
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

  const walletProvider = new WalletProvider(provider);
  const signingAddress = walletProvider.addAccount(privateKey);
  console.log(`Signing address: ${signingAddress}`);
  return walletProvider;
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
    feeGasPrice: state.feeGasPrice.toString(),
  });

  return state;
}

function getOrmConfig(): ConnectionOptions {
  return {
    type: 'sqlite',
    database: 'data/db.sqlite',
    entities: [TxDao, JoinSplitTxDao, AccountTxDao, RollupProofDao, RollupDao],
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
