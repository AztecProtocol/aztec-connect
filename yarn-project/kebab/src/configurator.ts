import { EthAddress } from '@aztec/barretenberg/address';
import { dirname } from 'path';
import fsExtra from 'fs-extra';
const { mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } = fsExtra;

export interface StartupConfig {
  // The port number on which to start the http service. Env: PORT
  port: number;
  // The URL of an Ethereum node that Kebab uses to serve requests & build the Aztec Connect logs DB. Env: ETHEREUM_HOST
  ethereumHost: string;
  // The prefix used as part of Kebab's API routes e.g. https://aztec-connect-dev-eth-host.aztec.network:8545/<api prefix>/status. Env: API_PREFIX
  apiPrefix: string;
  // A flag specifying whether additional logging be added to DB calls. Env: TYPEORM_LOGGING
  typeOrmLogging: boolean;
  // A flag specifying whether Kebab should allow methods that DON'T start with `eth_` to be executed. Env: ALLOW_PRIVILEGED_METHODS
  allowPrivilegedMethods: boolean;
  // A list of specific methods that DON'T start with `eth_` that Kebab should allow to be executed. Env: ADDITIONAL_PERMITTED_METHODS
  additionalPermittedMethods: string[];
  // A list of keys that can restrict access to Kebab if specified. Adding an API key updates Kebab's endpoint that serves ETH requests.
  // e.g. POST https://aztec-connect-dev-eth-host.aztec.network:8545/<prefix>/<api key>
  apiKeys: string[];
  // A flag specifying whether Kebab should create an Aztec Connect event DB and serve related `eth_getLogs` calls from there. Env: INDEXING
  indexing: boolean;
  // The Ethereum address of the Aztec Connect contract. Env: ROLLUP_CONTRACT_ADDRESS
  rollupContractAddress: EthAddress;
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
  rollupContractAddress: EthAddress.ZERO,
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
    ROLLUP_CONTRACT_ADDRESS,
  } = process.env;

  const envVars: Partial<StartupConfig> = {
    port: PORT ? +PORT : undefined,
    ethereumHost: ETHEREUM_HOST,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    allowPrivilegedMethods: ALLOW_PRIVILEGED_METHODS ? ALLOW_PRIVILEGED_METHODS === 'true' : undefined,
    additionalPermittedMethods: ADDITIONAL_PERMITTED_METHODS ? ADDITIONAL_PERMITTED_METHODS.split(',') : undefined,
    apiKeys: API_KEYS ? API_KEYS.split(',') : undefined,
    indexing: INDEXING ? INDEXING === 'true' : undefined,
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS ? EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS) : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

export type ConfVars = StartupConfig;

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

    if (pathExistsSync(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = this.readConfigFile(this.confPath);

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      // ContractConfig: Don't take from the given environment
      this.confVars = {
        ...defaultStartupConfig,
        ...saved,
        ...startupConfigEnvVars,
      };
    } else {
      // Priorities: Environment, defaults.
      this.confVars = {
        ...defaultStartupConfig,
        ...startupConfigEnvVars,
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
      rollupContractAddress: EthAddress.fromString(conf.rollupContractAddress),
    };
  }

  /**
   * Saves configuration to file. Sets acceptingTxs to true, as it's assumed if the system is restarted,
   * we want to accept txs again when ready.
   */
  private writeConfigFile(path: string, conf: ConfVars) {
    const toWrite = {
      ...conf,
      rollupContractAddress: conf.rollupContractAddress.toString(),
    };
    writeJsonSync(path, toWrite);
  }
}
