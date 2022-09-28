import { mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } from 'fs-extra';
import { dirname } from 'path';
import { EthAddress } from '@aztec/barretenberg/address';

export interface StartupConfig {
  port: number;
  rollupContractAddress: EthAddress;
  ethereumHost: string;
  apiPrefix: string;
  typeOrmLogging: boolean;
  allowPrivilegedMethods: boolean;
}

const defaultStartupConfig: StartupConfig = {
  port: 8546,
  rollupContractAddress: EthAddress.ZERO,
  ethereumHost: 'http://localhost:8545',
  apiPrefix: '',
  typeOrmLogging: false,
  allowPrivilegedMethods: false,
};

function getStartupConfigEnvVars(): Partial<StartupConfig> {
  const { ETHEREUM_HOST, PORT, API_PREFIX, TYPEORM_LOGGING, ROLLUP_CONTRACT_ADDRESS, ALLOW_PRIVILEGED_METHODS } =
    process.env;

  const envVars: Partial<StartupConfig> = {
    port: PORT ? +PORT : undefined,
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS ? EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS) : undefined,
    ethereumHost: ETHEREUM_HOST,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    allowPrivilegedMethods: ALLOW_PRIVILEGED_METHODS ? ALLOW_PRIVILEGED_METHODS === 'true' : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

export class Configurator {
  private confVars!: StartupConfig;
  private rollupContractChanged = false;

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
      const saved: StartupConfig = this.readConfigFile(this.confPath);
      const { rollupContractAddress } = startupConfigEnvVars;
      if (rollupContractAddress && !rollupContractAddress.equals(saved.rollupContractAddress)) {
        console.log(
          `Rollup contract changed: ${saved.rollupContractAddress.toString()} -> ${rollupContractAddress.toString()}`,
        );
        this.rollupContractChanged = true;
      }

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      const { ...savedStartupConfig } = saved;
      this.confVars = {
        ...defaultStartupConfig,
        ...savedStartupConfig,
        ...startupConfigEnvVars,
      };
    } else {
      // Priorities:
      // StartupConfig: Environment, defaults.
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
  private readConfigFile(path: string): StartupConfig {
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
  private writeConfigFile(path: string, conf: StartupConfig) {
    writeJsonSync(path, {
      ...conf,
      rollupContractAddress: conf.rollupContractAddress.toString(),
    });
  }
}
