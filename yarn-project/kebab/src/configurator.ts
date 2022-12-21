import { EthAddress } from '@aztec/barretenberg/address';
import { dirname } from 'path';
import fsExtra from 'fs-extra';
const { mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } = fsExtra;

export interface StartupConfig {
  port: number;
  ethereumHost: string;
  apiPrefix: string;
  typeOrmLogging: boolean;
  allowPrivilegedMethods: boolean;
  additionalPermittedMethods: string[];
  apiKeys: string[];
  indexing: boolean;
}

export interface ContractConfig {
  rollupContractAddress?: EthAddress;
  priceFeedContractAddresses?: EthAddress[];
  permitHelperContractAddress?: EthAddress;
  feeDistributorAddress?: EthAddress;
  faucetContractAddress?: EthAddress;
  bridgeDataProviderContractAddress?: EthAddress;
}

const defaultStartupConfig: StartupConfig = {
  port: 8545,
  ethereumHost: 'http://localhost:8544',
  apiPrefix: '',
  typeOrmLogging: false,
  allowPrivilegedMethods: false,
  additionalPermittedMethods: [],
  apiKeys: [],
  indexing: true,
};

const defaultContractConfig: ContractConfig = {
  rollupContractAddress: EthAddress.ZERO,
  priceFeedContractAddresses: [],
  permitHelperContractAddress: EthAddress.ZERO,
  feeDistributorAddress: EthAddress.ZERO,
  faucetContractAddress: EthAddress.ZERO,
  bridgeDataProviderContractAddress: EthAddress.ZERO,
};

function getStartupConfigEnvVars(): Partial<StartupConfig> {
  const {
    ETHEREUM_HOST,
    PORT,
    API_PREFIX,
    TYPEORM_LOGGING,
    ALLOW_PRIVILEGED_METHODS,
    ADDITIONAL_PERMITTED_METHODS,
    API_KEYS,
    INDEXING,
  } = process.env;

  const envVars: Partial<StartupConfig> = {
    port: PORT ? +PORT : undefined,
    ethereumHost: ETHEREUM_HOST,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    allowPrivilegedMethods: ALLOW_PRIVILEGED_METHODS ? ALLOW_PRIVILEGED_METHODS === 'true' : undefined,
    additionalPermittedMethods: ADDITIONAL_PERMITTED_METHODS ? ADDITIONAL_PERMITTED_METHODS.split(',') : [],
    apiKeys: API_KEYS ? API_KEYS.split(',') : [],
    indexing: INDEXING ? INDEXING === 'true' : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

/** Get Contract Config Env Vars
 *
 * @notice Kebab requires that required addresses are provided through
 *         Environment variables. Panic if any required addresses are not found.
 */
function getContractConfigEnvVars() {
  const {
    ETHEREUM_HOST,
    ROLLUP_CONTRACT_ADDRESS,
    PERMIT_HELPER_CONTRACT_ADDRESS,
    FEE_DISTRIBUTOR_ADDRESS,
    PRICE_FEED_CONTRACT_ADDRESSES,
    BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS,
  } = process.env;

  if (
    !ETHEREUM_HOST ||
    !ROLLUP_CONTRACT_ADDRESS ||
    !PERMIT_HELPER_CONTRACT_ADDRESS ||
    !FEE_DISTRIBUTOR_ADDRESS ||
    !PRICE_FEED_CONTRACT_ADDRESSES ||
    !BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS
  ) {
    throw new Error(
      'ASSERT | ETHEREUM_HOST, ROLLUP_CONTRACT_ADDRESS, PERMIT_HELPER_CONTRACT_ADDRESS, FEE_DISTRIBUTOR_ADDRESS, PRICE_FEED_CONTRACT_ADDRESSES and BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS MUST be set',
    );
  }

  const contractConfig: ContractConfig = {};
  contractConfig.rollupContractAddress = EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS);
  contractConfig.permitHelperContractAddress = EthAddress.fromString(PERMIT_HELPER_CONTRACT_ADDRESS);
  contractConfig.feeDistributorAddress = EthAddress.fromString(FEE_DISTRIBUTOR_ADDRESS);
  contractConfig.priceFeedContractAddresses = PRICE_FEED_CONTRACT_ADDRESSES.split(',').map(EthAddress.fromString);
  contractConfig.bridgeDataProviderContractAddress = EthAddress.fromString(BRIDGE_DATA_PROVIDER_CONTRACT_ADDRESS);
  return contractConfig;
}

export interface ConfVars extends StartupConfig {
  contractConfig: ContractConfig;
}

export class Configurator {
  private confVars!: ConfVars;

  /**
   * Builds a launch time configuration from environment variables.
   * If it exists, loads a previous instances configuration from disk.
   * If the rollup contract has changed, empty the entire data dir.
   * Save the new configuration to disk.
   */
  constructor(private confPath = './data/config') {
    const dir = dirname(this.confPath);
    mkdirpSync(dir);

    const startupConfigEnvVars = getStartupConfigEnvVars();
    const startupContractEnvVars = getContractConfigEnvVars();

    if (pathExistsSync(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = this.readConfigFile(this.confPath);

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      // ContractConfig: Don't take from the given environment
      const { contractConfig: savedContractConfig, ...savedStartupConfig } = saved;
      this.confVars = {
        ...defaultStartupConfig,
        ...savedStartupConfig,
        ...startupConfigEnvVars,
        contractConfig: {
          ...defaultContractConfig,
          ...startupContractEnvVars,
          ...savedContractConfig,
        },
      };
    } else {
      // Priorities:
      // StartupConfig: Environment, defaults.
      // ContractConfig: Environment, defaults.
      this.confVars = {
        ...defaultStartupConfig,
        ...startupConfigEnvVars,
        contractConfig: {
          ...defaultContractConfig,
          ...startupContractEnvVars,
        },
      };
    }

    this.writeConfigFile(this.confPath, this.confVars);
  }

  public getConfVars() {
    return this.confVars;
  }

  /**
   * Loads configuration from file.
   */
  private readConfigFile(path: string): ConfVars {
    const conf = readJsonSync(path);
    return {
      ...conf,
      contractConfig: {
        ...conf.contractConfig,
        rollupContractAddress: conf.contractConfig.rollupContractAddress
          ? EthAddress.fromString(conf.contractConfig.rollupContractAddress)
          : EthAddress.ZERO,
        permitHelperContractAddress: conf.contractConfig.permitHelperContractAddress
          ? EthAddress.fromString(conf.contractConfig.permitHelperContractAddress)
          : EthAddress.ZERO,
        feeDistributorAddress: conf.contractConfig.feeDistributorAddress
          ? EthAddress.fromString(conf.contractConfig.feeDistributorAddress)
          : EthAddress.ZERO,
        faucetContractAddress: conf.contractConfig.faucetContractAddress
          ? EthAddress.fromString(conf.contractConfig.faucetContractAddress)
          : EthAddress.ZERO,
        bridgeDataProviderContractAddress: conf.contractConfig.bridgeDataProviderContractAddress
          ? EthAddress.fromString(conf.contractConfig.bridgeDataProviderContractAddress)
          : EthAddress.ZERO,
        priceFeedContractAddresses: conf.contractConfig.priceFeedContractAddresses
          ? conf.contractConfig.priceFeedContractAddresses.map(EthAddress.fromString)
          : [],
      },
    };
  }

  /**
   * Saves configuration to file. Sets acceptingTxs to true, as it's assumed if the system is restarted,
   * we want to accept txs again when ready.
   */
  private writeConfigFile(path: string, conf: ConfVars) {
    const toWrite = {
      ...conf,
      contractConfig: {
        ...conf.contractConfig,
        rollupContractAddress: conf.contractConfig.rollupContractAddress?.toString(),
        permitHelperContractAddress: conf.contractConfig.permitHelperContractAddress?.toString(),
        feeDistributorAddress: conf.contractConfig.feeDistributorAddress?.toString(),
        faucetContractAddress: conf.contractConfig.faucetContractAddress?.toString(),
        bridgeDataProviderContractAddress: conf.contractConfig?.bridgeDataProviderContractAddress?.toString(),
        priceFeedContractAddresses: conf.contractConfig.priceFeedContractAddresses
          ? conf.contractConfig.priceFeedContractAddresses.map(x => x.toString())
          : undefined,
      },
    };
    writeJsonSync(path, toWrite);
  }

  public saveContractConfig(contractConfig: ContractConfig) {
    const prevContractConfig = this.confVars.contractConfig;
    this.confVars = {
      ...this.confVars,
      contractConfig: {
        ...prevContractConfig,
        ...contractConfig,
      },
    };
    this.writeConfigFile(this.confPath, this.confVars);
  }
}
