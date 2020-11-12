import { EthersAdapter, WalletProvider } from 'blockchain';
import { randomBytes } from 'crypto';
import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';
import { dirname } from 'path';
import { JsonRpcProvider, InfuraProvider } from '@ethersproject/providers';

interface ConfVars {
  port: number;
  rollupContractAddress?: string;
  ethereumHost?: string;
  infuraApiKey?: string;
  network?: string;
  privateKey?: Buffer;
  rollupSize: number;
  maxRollupWaitTime: number;
  minRollupInterval: number;
  minConfirmation: number;
  minConfirmationEHW: number;
  gasLimit?: number;
  apiPrefix: string;
  serverAuthToken: string;
  localBlockchainInitSize?: number;
}

function getConfVars(): ConfVars {
  const {
    ROLLUP_CONTRACT_ADDRESS,
    ETHEREUM_HOST,
    INFURA_API_KEY,
    NETWORK,
    PRIVATE_KEY,
    PORT,
    ROLLUP_SIZE,
    MAX_ROLLUP_WAIT_TIME,
    MIN_ROLLUP_INTERVAL,
    MIN_CONFIRMATION,
    MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
    LOCAL_BLOCKCHAIN_INIT_SIZE,
    API_PREFIX,
    GAS_LIMIT,
    SERVER_AUTH_TOKEN,
  } = process.env;

  return {
    port: +(PORT || 8081),
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS,
    ethereumHost: ETHEREUM_HOST,
    infuraApiKey: INFURA_API_KEY,
    network: NETWORK,
    privateKey: PRIVATE_KEY ? Buffer.from(PRIVATE_KEY.slice(2), 'hex') : undefined,
    rollupSize: +(ROLLUP_SIZE || 2),
    maxRollupWaitTime: +(MAX_ROLLUP_WAIT_TIME || 10),
    minRollupInterval: +(MIN_ROLLUP_INTERVAL || 0),
    minConfirmation: +(MIN_CONFIRMATION || 1),
    minConfirmationEHW: +(MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW || 12),
    gasLimit: GAS_LIMIT ? +GAS_LIMIT : undefined,
    apiPrefix: API_PREFIX || '',
    serverAuthToken: SERVER_AUTH_TOKEN || randomBytes(32).toString('hex'),
    localBlockchainInitSize: LOCAL_BLOCKCHAIN_INIT_SIZE ? +LOCAL_BLOCKCHAIN_INIT_SIZE : undefined,
  };
}

function getEthereumBlockchainConfig({
  gasLimit,
  minConfirmation,
  minConfirmationEHW,
  network,
  ethereumHost,
}: ConfVars) {
  return {
    networkOrHost: network || ethereumHost || 'local',
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
    return;
  }
  if (privateKey) {
    const walletProvider = new WalletProvider(provider);
    const signingAddress = walletProvider.addAccount(privateKey);
    console.log(`Signing address: ${signingAddress}`);
    return { provider: walletProvider, signingAddress };
  }
  return { provider };
}

async function loadConfVars(path: string) {
  const dir = dirname(path);
  const state = getConfVars();

  if (!(await pathExists(path))) {
    await mkdirp(dir);
    await writeJson(path, state);
    return state;
  }

  const saved = await readJson(path);

  // Erase all data if rollup contract changes.
  if (state.rollupContractAddress && state.rollupContractAddress !== saved.rollupContractAddress) {
    console.log(
      `Rollup contract changed, erasing data: ${saved.rollupContractAddress} -> ${state.rollupContractAddress}`,
    );
    await emptyDir(dir);
  }

  // Save, redacting private key.
  await writeJson(path, { ...state, privateKey: undefined });

  return state;
}

export async function getConfig() {
  const confVars = await loadConfVars('./data/config');
  const { gasLimit, rollupContractAddress } = confVars;

  console.log(`Gas limit: ${gasLimit || 'default'}`);
  console.log(`Rollup contract address: ${rollupContractAddress || 'none'}`);

  return { confVars, provider: getProvider(confVars), ethConfig: getEthereumBlockchainConfig(confVars) };
}
