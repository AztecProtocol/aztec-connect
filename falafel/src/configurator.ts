import { emptyDirSync, mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } from 'fs-extra';
import { dirname } from 'path';
import { RuntimeConfig } from '@aztec/barretenberg/rollup_provider';
import { EthAddress } from '@aztec/barretenberg/address';

interface StartupConfig {
  port: number;
  dbUrl?: string;
  rollupContractAddress: EthAddress;
  feeDistributorAddress: EthAddress;
  priceFeedContractAddresses: EthAddress[];
  feePayingAssetAddresses: EthAddress[];
  ethereumHost: string;
  ethereumPollInterval?: number;
  proofGeneratorMode: string;
  privateKey: Buffer;
  numInnerRollupTxs: number;
  numOuterRollupProofs: number;
  apiPrefix: string;
  serverAuthToken: string;
  minConfirmation: number;
  minConfirmationEHW: number;
  typeOrmLogging: boolean;
  proverless: boolean;
}

export interface ConfVars extends StartupConfig {
  runtimeConfig: RuntimeConfig;
}

const defaultStartupConfig: StartupConfig = {
  port: 8081,
  rollupContractAddress: EthAddress.ZERO,
  feeDistributorAddress: EthAddress.ZERO,
  priceFeedContractAddresses: [],
  feePayingAssetAddresses: [],
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
};

const defaultRuntimeConfig: RuntimeConfig = {
  acceptingTxs: true,
  useKeyCache: false,
  publishInterval: 0,
  flushAfterIdle: 0,
  gasLimit: 4000000,
  baseTxGas: 16000,
  verificationGas: 500000,
  maxFeeGasPrice: 250000000000n,
  feeGasPriceMultiplier: 1,
  feeRoundUpSignificantFigures: 2,
  maxProviderGasPrice: 250000000000n,
  maxUnsettledTxs: 0,
  defaultDeFiBatchSize: 5,
};

function getStartupConfigEnvVars(): Partial<StartupConfig> {
  const {
    DB_URL,
    ROLLUP_CONTRACT_ADDRESS,
    FEE_DISTRIBUTOR_ADDRESS,
    PRICE_FEED_CONTRACT_ADDRESSES,
    FEE_PAYING_ASSET_ADDRESSES,
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
  } = process.env;

  const envVars: Partial<StartupConfig> = {
    port: PORT ? +PORT : undefined,
    dbUrl: DB_URL,
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS ? EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS) : undefined,
    feeDistributorAddress: FEE_DISTRIBUTOR_ADDRESS ? EthAddress.fromString(FEE_DISTRIBUTOR_ADDRESS) : undefined,
    priceFeedContractAddresses: PRICE_FEED_CONTRACT_ADDRESSES
      ? PRICE_FEED_CONTRACT_ADDRESSES.split(',').map(EthAddress.fromString)
      : undefined,
    feePayingAssetAddresses: FEE_PAYING_ASSET_ADDRESSES
      ? FEE_PAYING_ASSET_ADDRESSES.split(',').map(EthAddress.fromString)
      : undefined,
    ethereumHost: ETHEREUM_HOST,
    ethereumPollInterval: ETHEREUM_POLL_INTERVAL ? +ETHEREUM_POLL_INTERVAL : undefined,
    proofGeneratorMode: PROOF_GENERATOR_MODE,
    privateKey: PRIVATE_KEY ? Buffer.from(PRIVATE_KEY.slice(2), 'hex') : undefined,
    numInnerRollupTxs: NUM_INNER_ROLLUP_TXS ? +NUM_INNER_ROLLUP_TXS : undefined,
    numOuterRollupProofs: NUM_OUTER_ROLLUP_PROOFS ? +NUM_OUTER_ROLLUP_PROOFS : undefined,
    minConfirmation: MIN_CONFIRMATION ? +MIN_CONFIRMATION : undefined,
    minConfirmationEHW: MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW ? +MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW : undefined,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    proverless: PROVERLESS ? PROVERLESS === 'true' : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

function getRuntimeConfigEnvVars(): Partial<RuntimeConfig> {
  const { BASE_TX_GAS, FEE_GAS_PRICE_MULTIPLIER, PUBLISH_INTERVAL, FLUSH_AFTER_IDLE, DEFAULT_DEFI_BATCH_SIZE } =
    process.env;

  const envVars = {
    publishInterval: PUBLISH_INTERVAL ? +PUBLISH_INTERVAL : undefined,
    flushAfterIdle: FLUSH_AFTER_IDLE ? +FLUSH_AFTER_IDLE : undefined,
    baseTxGas: BASE_TX_GAS ? +BASE_TX_GAS : undefined,
    feeGasPriceMultiplier: FEE_GAS_PRICE_MULTIPLIER ? +FEE_GAS_PRICE_MULTIPLIER : undefined,
    defaultDeFiBatchSize: DEFAULT_DEFI_BATCH_SIZE ? +DEFAULT_DEFI_BATCH_SIZE : undefined,
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
  constructor(private confPath = './data/config') {
    const dir = dirname(this.confPath);
    mkdirpSync(dir);

    const startupConfigEnvVars = getStartupConfigEnvVars();
    const runtimeConfigEnvVars = getRuntimeConfigEnvVars();

    if (pathExistsSync(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = this.readConfigFile(this.confPath);
      const { rollupContractAddress } = startupConfigEnvVars;
      if (rollupContractAddress && !rollupContractAddress.equals(saved.rollupContractAddress)) {
        console.log(
          `Rollup contract changed, erasing data: ${saved.rollupContractAddress.toString()} -> ${this.confVars.rollupContractAddress.toString()}`,
        );
        emptyDirSync(dir);
      }

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      // RuntimeConfig: Saved, Environment, defaults.
      const { runtimeConfig: savedRuntimeConfig, ...savedStartupConfig } = saved;
      this.confVars = {
        ...defaultStartupConfig,
        ...savedStartupConfig,
        ...startupConfigEnvVars,
        runtimeConfig: {
          ...defaultRuntimeConfig,
          ...runtimeConfigEnvVars,
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
          ...runtimeConfigEnvVars,
        },
      };
    }

    this.writeConfigFile(this.confPath, this.confVars);
  }

  public getConfVars() {
    return this.confVars;
  }

  public async saveRuntimeConfig(runtimeConfig: Partial<RuntimeConfig>) {
    this.confVars.runtimeConfig = {
      ...this.confVars.runtimeConfig,
      ...runtimeConfig,
    };
    this.writeConfigFile(this.confPath, this.confVars);
  }

  /**
   * Loads configuration from file.
   */
  private readConfigFile(path: string): ConfVars {
    const conf = readJsonSync(path);
    return {
      ...conf,
      rollupContractAddress: EthAddress.fromString(conf.rollupContractAddress),
      feeDistributorAddress: EthAddress.fromString(conf.feeDistributorAddress),
      priceFeedContractAddresses: conf.priceFeedContractAddresses.map(EthAddress.fromString),
      feePayingAssetAddresses: conf.feePayingAssetAddresses.map(EthAddress.fromString),
      privateKey: Buffer.from(conf.privateKey, 'hex'),
      runtimeConfig: {
        ...conf.runtimeConfig,
        maxFeeGasPrice: BigInt(conf.runtimeConfig.maxFeeGasPrice),
        maxProviderGasPrice: BigInt(conf.runtimeConfig.maxProviderGasPrice),
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
      feeDistributorAddress: conf.feeDistributorAddress.toString(),
      priceFeedContractAddresses: conf.priceFeedContractAddresses.map(a => a.toString()),
      feePayingAssetAddresses: conf.feePayingAssetAddresses.map(a => a.toString()),
      privateKey: conf.privateKey.toString('hex'),
      runtimeConfig: {
        ...conf.runtimeConfig,
        acceptingTxs: true,
        maxFeeGasPrice: conf.runtimeConfig.maxFeeGasPrice.toString(),
        maxProviderGasPrice: conf.runtimeConfig.maxProviderGasPrice.toString(),
      },
    });
  }
}
