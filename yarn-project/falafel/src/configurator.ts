import { dirname } from 'path';
import {
  RuntimeConfig,
  privacySetsFromJson,
  privacySetsToJson,
  getDefaultPrivacySets,
} from '@aztec/barretenberg/rollup_provider';
import { EthAddress } from '@aztec/barretenberg/address';
import fsExtra from 'fs-extra';
const { mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } = fsExtra;
import { FALAFEL_VERSION } from './version.js';

const { DATA_DIR = './data', INITIAL_RUNTIME_CONFIG_PATH = undefined } = process.env;

export type SupportedDb = 'mysql' | 'postgres' | 'sqlite';

interface StartupConfig {
  // A string of the form MAJ.MIN.SUB returned in the status request so clients can be notified of breaking api changes. Env: FALAFEL_VERSION_OVERRIDE
  version: string;
  // The port number on which to start the http service. Env: PORT
  port: number;
  // An optional postgres DB connection string, if absent Falafel will use a local SQLite DB. Env: DB_URL
  dbUrl?: string;
  // The address of the rollup contract. Env: ROLLUP_CONTRACT_ADDRESS
  rollupContractAddress: EthAddress;
  // The address of the permit helper contract. Env: PERMIT_HELPER_CONTRACT_ADDRESS
  permitHelperContractAddress: EthAddress;
  // Addresses of price feed contracts for pricing gas and asset valuations Env: PRICE_FEED_CONTRACT_ADDRESSES
  priceFeedContractAddresses: EthAddress[];
  // Address of data provider contract. Env: BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS
  bridgeDataProviderAddress: EthAddress;
  // URL of JSON RPC endpoint for all blockchain interactions. Env: ETHEREUM_HOST
  ethereumHost: string;
  // Optional period with which to poll for new rollups. Env: ETHEREUM_POLL_INTERVAL
  ethereumPollInterval?: number;
  // A string specifying the mode under which halloumi proof constructors are deployed. Valid values are 'split' and 'local'. Anything else defaults to 'normal'. Env: PROOF_GENERATOR_MODE
  proofGeneratorMode: string;
  // The private key to be used for publishing rollups. Env: PRIVATE_KEY
  privateKey: Buffer;
  // The number of txs within an 'inner' rollup. Env: NUM_INNER_ROLLUP_TXS
  numInnerRollupTxs: number;
  // The number of txs within an 'outer' rollup. Env: NUM_OUTER_ROLLUP_PROOFS
  numOuterRollupProofs: number;
  // The prefix used as part of all api routes e.g. https://api.aztec.network/<api prefix>/status. Env: API_PREFIX
  apiPrefix: string;
  // String required to be specified in the 'server-auth-token' header of administrative requests. Env: SERVER_AUTH_TOKEN
  serverAuthToken: string;
  // The number of confirmations required for a rollup to be accepted. Env: MIN_CONFIRMATION
  minConfirmation: number;
  // The number of confirmations required for a rollup to be accepted within the Escape Hatch. Env: MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW
  minConfirmationEHW: number;
  // A flag specifying whether additional logging be added to DB calls. Env: TYPEORM_LOGGING
  typeOrmLogging: boolean;
  // A flag specifying whether the system should be run as 'proverless'. This should only used within test environments. Env: PROVERLESS
  proverless: boolean;
  // The maximum amount of call data that can be consumed by a rollup. Env: CALL_DATA_LIMIT_KB
  rollupCallDataLimit: number;
  // To be turned on when Aztec Connect is sunset. Means that users are only allowed to exit AC. Env: EXIT_ONLY
  exitOnly: boolean;
  // Added once subsidy retrieval started failing to allow us to disable it.
  enableSubsidies: boolean;
}

export interface ConfVars extends StartupConfig {
  runtimeConfig: RuntimeConfig;
}

const defaultStartupConfig: StartupConfig = {
  version: '',
  port: 8081,
  rollupContractAddress: EthAddress.ZERO,
  permitHelperContractAddress: EthAddress.ZERO,
  priceFeedContractAddresses: [],
  bridgeDataProviderAddress: EthAddress.ZERO,
  ethereumHost: 'http://localhost:8545',
  ethereumPollInterval: 10000,
  proofGeneratorMode: 'normal',
  // Test mnemonic account 0.
  privateKey: Buffer.from('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'hex'),
  numInnerRollupTxs: 1,
  numOuterRollupProofs: 1,
  minConfirmation: 1,
  minConfirmationEHW: 12,
  apiPrefix: '',
  serverAuthToken: '!changeme#',
  typeOrmLogging: false,
  proverless: false,
  exitOnly: false,
  rollupCallDataLimit: 120 * 1024,
  enableSubsidies: false,
};

const defaultRuntimeConfig: RuntimeConfig = {
  acceptingTxs: true,
  useKeyCache: false,
  publishInterval: 0,
  flushAfterIdle: 0,
  gasLimit: 12000000,
  verificationGas: 500000,
  maxFeeGasPrice: 250000000000n, // 250 gwei
  feeGasPriceMultiplier: 1,
  feeRoundUpSignificantFigures: 2,
  maxFeePerGas: 250000000000n, // 250 gwei
  maxPriorityFeePerGas: 2500000000n, // 2.5 gwei
  maxUnsettledTxs: 10000,
  defaultDeFiBatchSize: 5,
  bridgeConfigs: [],
  feePayingAssetIds: [0],
  privacySets: getDefaultPrivacySets(),
  depositLimit: 10,
  blacklist: [],
};

function getStartupConfigEnvVars(): Partial<StartupConfig> {
  const {
    EXIT_ONLY,
    FALAFEL_VERSION_OVERRIDE,
    DB_URL,
    ROLLUP_CONTRACT_ADDRESS,
    PERMIT_HELPER_CONTRACT_ADDRESS,
    PRICE_FEED_CONTRACT_ADDRESSES,
    BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS,
    ETHEREUM_HOST,
    ETHEREUM_POLL_INTERVAL,
    PROOF_GENERATOR_MODE,
    PRIVATE_KEY,
    PORT,
    NUM_INNER_ROLLUP_TXS,
    NUM_OUTER_ROLLUP_PROOFS,
    MIN_CONFIRMATION,
    MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
    API_PREFIX,
    PROVERLESS,
    TYPEORM_LOGGING,
    SERVER_AUTH_TOKEN,
    CALL_DATA_LIMIT_KB,
    ENABLE_SUBSIDIES,
  } = process.env;

  const envVars: Partial<StartupConfig> = {
    version: FALAFEL_VERSION_OVERRIDE || FALAFEL_VERSION, // if no override, always use FALAFEL_VERSION
    port: PORT ? +PORT : undefined,
    dbUrl: DB_URL,
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS ? EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS) : undefined,
    permitHelperContractAddress: PERMIT_HELPER_CONTRACT_ADDRESS
      ? EthAddress.fromString(PERMIT_HELPER_CONTRACT_ADDRESS)
      : undefined,
    priceFeedContractAddresses: PRICE_FEED_CONTRACT_ADDRESSES
      ? PRICE_FEED_CONTRACT_ADDRESSES.split(',').map(EthAddress.fromString)
      : undefined,
    bridgeDataProviderAddress: BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS
      ? EthAddress.fromString(BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS)
      : undefined,
    ethereumHost: ETHEREUM_HOST,
    ethereumPollInterval: ETHEREUM_POLL_INTERVAL ? +ETHEREUM_POLL_INTERVAL : undefined,
    proofGeneratorMode: PROOF_GENERATOR_MODE,
    privateKey: PRIVATE_KEY ? Buffer.from(PRIVATE_KEY.replace('0x', ''), 'hex') : undefined,
    numInnerRollupTxs: NUM_INNER_ROLLUP_TXS ? +NUM_INNER_ROLLUP_TXS : undefined,
    numOuterRollupProofs: NUM_OUTER_ROLLUP_PROOFS ? +NUM_OUTER_ROLLUP_PROOFS : undefined,
    minConfirmation: MIN_CONFIRMATION ? +MIN_CONFIRMATION : undefined,
    minConfirmationEHW: MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW ? +MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW : undefined,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    proverless: PROVERLESS ? PROVERLESS === 'true' : undefined,
    exitOnly: EXIT_ONLY ? EXIT_ONLY === 'true' : undefined,
    serverAuthToken: SERVER_AUTH_TOKEN,
    rollupCallDataLimit: CALL_DATA_LIMIT_KB ? +CALL_DATA_LIMIT_KB * 1024 : undefined,
    enableSubsidies: ENABLE_SUBSIDIES ? ENABLE_SUBSIDIES === 'true' : false,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

function getRuntimeConfigEnvVars(): Partial<RuntimeConfig> {
  const {
    FEE_GAS_PRICE_MULTIPLIER,
    PUBLISH_INTERVAL,
    FLUSH_AFTER_IDLE,
    DEFAULT_DEFI_BATCH_SIZE,
    FEE_PAYING_ASSET_IDS,
    FEE_DISTRIBUTOR_ADDRESS,
  } = process.env;

  const envVars = {
    publishInterval: PUBLISH_INTERVAL ? +PUBLISH_INTERVAL : undefined,
    flushAfterIdle: FLUSH_AFTER_IDLE ? +FLUSH_AFTER_IDLE : undefined,
    feeGasPriceMultiplier: FEE_GAS_PRICE_MULTIPLIER ? +FEE_GAS_PRICE_MULTIPLIER : undefined,
    defaultDeFiBatchSize: DEFAULT_DEFI_BATCH_SIZE ? +DEFAULT_DEFI_BATCH_SIZE : undefined,
    feePayingAssetIds: FEE_PAYING_ASSET_IDS ? FEE_PAYING_ASSET_IDS.split(',').map(id => +id) : undefined,

    rollupBeneficiary: FEE_DISTRIBUTOR_ADDRESS ? EthAddress.fromString(FEE_DISTRIBUTOR_ADDRESS) : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

export class Configurator {
  private confVars!: ConfVars;

  /**
   * Builds a launch time configuration from environment variables.
   * If it exists, loads a previous instances configuration from disk.
   * If the rollup contract has changed, empty the entire data dir.
   * Update the configuration with the saved runtime configuration (if it exists).
   * Save the new configuration to disk.
   */
  constructor(private confPath = `${DATA_DIR}/config`, private initialRuntimeConfigPath = INITIAL_RUNTIME_CONFIG_PATH) {
    if (process.env.JEST_WORKER_ID) {
      // Ensure when we run tests, we don't create any disk state. We have to do this horrific check due
      // to the fact the Configurator must be created globally as part of init_entities.
      this.confVars = {
        ...defaultStartupConfig,
        runtimeConfig: defaultRuntimeConfig,
      };
      return;
    }

    const dir = dirname(this.confPath);
    mkdirpSync(dir);

    const startupConfigEnvVars = getStartupConfigEnvVars();
    const runtimeConfigEnvVars = getRuntimeConfigEnvVars();

    // Bootstrap the runtime config when in dev / testnet environments
    const initialRuntimeConfig = this.readInitialRuntimeConfigFile(this.initialRuntimeConfigPath);

    if (pathExistsSync(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = this.readConfigFile(this.confPath);

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      // RuntimeConfig: Saved, Initial, Environment, defaults.
      const { runtimeConfig: savedRuntimeConfig, ...savedStartupConfig } = saved;
      this.confVars = {
        ...defaultStartupConfig,
        ...savedStartupConfig,
        ...startupConfigEnvVars,
        runtimeConfig: {
          ...defaultRuntimeConfig,
          ...runtimeConfigEnvVars,
          ...initialRuntimeConfig,
          ...savedRuntimeConfig,
        },
      };
    } else {
      // Priorities:
      // StartupConfig: Environment, defaults.
      // RuntimeConfig: Environment, defaults.
      this.confVars = {
        ...defaultStartupConfig,
        ...startupConfigEnvVars,
        runtimeConfig: {
          ...defaultRuntimeConfig,
          ...initialRuntimeConfig,
          ...runtimeConfigEnvVars,
        },
      };
    }

    this.writeConfigFile(this.confPath, this.confVars);
  }

  public getConfVars() {
    return this.confVars;
  }

  public getDataDir() {
    return DATA_DIR;
  }

  public getDbType(): SupportedDb {
    const dbUrl = configurator.getConfVars().dbUrl;
    if (dbUrl) {
      const url = new URL(dbUrl);
      return url.protocol.slice(0, -1) as SupportedDb;
    }
    return 'sqlite';
  }

  public saveRuntimeConfig(runtimeConfig: Partial<RuntimeConfig>) {
    const prevRuntimeConfig = this.confVars.runtimeConfig;
    this.confVars = {
      ...this.confVars,
      runtimeConfig: {
        ...prevRuntimeConfig,
        ...runtimeConfig,
      },
    };
    this.writeConfigFile(this.confPath, this.confVars);
  }

  /** Read Initial Runtime Config
   *
   * @notice Read initial bootstrapping runtime config from a configured file.
   *         If none is provided, then an empty object is returned.
   *
   * @param path
   * @returns
   */
  private readInitialRuntimeConfigFile(path: string | undefined): Partial<RuntimeConfig> {
    if (!path || !pathExistsSync(path)) {
      return {};
    }
    return readJsonSync(path);
  }

  /**
   * Loads configuration from file.
   */
  private readConfigFile(path: string): ConfVars {
    const conf = readJsonSync(path);
    return {
      ...conf,
      rollupContractAddress: EthAddress.fromString(conf.rollupContractAddress),
      permitHelperContractAddress: conf.permitHelperContractAddress
        ? EthAddress.fromString(conf.permitHelperContractAddress)
        : undefined,
      bridgeDataProviderAddress: conf.bridgeDataProviderAddress
        ? EthAddress.fromString(conf.bridgeDataProviderAddress)
        : undefined,
      priceFeedContractAddresses: conf.priceFeedContractAddresses.map(EthAddress.fromString),
      privateKey: Buffer.from(conf.privateKey, 'hex'),
      runtimeConfig: {
        ...conf.runtimeConfig,
        maxFeeGasPrice: BigInt(conf.runtimeConfig.maxFeeGasPrice),
        maxFeePerGas: BigInt(conf.runtimeConfig.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(conf.runtimeConfig.maxPriorityFeePerGas),
        privacySets: privacySetsFromJson(conf.runtimeConfig.privacySets),
        rollupBeneficiary: conf.runtimeConfig.rollupBeneficiary
          ? EthAddress.fromString(conf.runtimeConfig.rollupBeneficiary)
          : undefined,
        blacklist: conf.runtimeConfig.blacklist
          ? conf.runtimeConfig.blacklist.map((x: string) => EthAddress.fromString(x))
          : [],
      },
    };
  }

  /**
   * Saves configuration to file. Sets acceptingTxs to true, as it's assumed if the system is restarted,
   * we want to accept txs again when ready.
   */
  private writeConfigFile(path: string, conf: ConfVars) {
    writeJsonSync(path, {
      ...conf,
      rollupContractAddress: conf.rollupContractAddress.toString(),
      permitHelperContractAddress: conf.permitHelperContractAddress
        ? conf.permitHelperContractAddress.toString()
        : undefined,
      bridgeDataProviderAddress: conf.bridgeDataProviderAddress ? conf.bridgeDataProviderAddress.toString() : undefined,
      priceFeedContractAddresses: conf.priceFeedContractAddresses.map(a => a.toString()),
      privateKey: conf.privateKey.toString('hex'),
      runtimeConfig: {
        ...conf.runtimeConfig,
        acceptingTxs: true,
        maxFeeGasPrice: conf.runtimeConfig.maxFeeGasPrice.toString(),
        maxFeePerGas: conf.runtimeConfig.maxFeePerGas.toString(),
        maxPriorityFeePerGas: conf.runtimeConfig.maxPriorityFeePerGas.toString(),
        privacySets: privacySetsToJson(conf.runtimeConfig.privacySets),
        rollupBeneficiary: conf.runtimeConfig.rollupBeneficiary
          ? conf.runtimeConfig.rollupBeneficiary.toString()
          : undefined,
        blacklist: conf.runtimeConfig.blacklist
          ? conf.runtimeConfig.blacklist.map((x: EthAddress) => x.toString())
          : [],
      },
    });
  }
}

export const configurator = new Configurator();
