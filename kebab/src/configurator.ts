import { EthAddress } from '@aztec/barretenberg/address';
import { mkdirpSync, pathExistsSync, readJsonSync, writeJsonSync } from 'fs-extra';
import { dirname } from 'path';

export interface StartupConfig {
  port: number;
  ethereumHost: string;
  apiPrefix: string;
  typeOrmLogging: boolean;
  allowPrivilegedMethods: boolean;
}

export interface RedeployConfig {
  redeploy?: number;
  rollupContractAddress?: EthAddress;
  priceFeedContractAddresses?: EthAddress[];
  permitHelperContractAddress?: EthAddress;
  feeDistributorAddress?: EthAddress;
  faucetContractAddress?: EthAddress;
}

const defaultStartupConfig: StartupConfig = {
  port: 8546,
  ethereumHost: 'http://localhost:8545',
  apiPrefix: '',
  typeOrmLogging: false,
  allowPrivilegedMethods: false,
};

const defaultRedeployConfig: RedeployConfig = {
  redeploy: undefined,
  rollupContractAddress: EthAddress.ZERO,
  priceFeedContractAddresses: [],
  permitHelperContractAddress: EthAddress.ZERO,
  feeDistributorAddress: EthAddress.ZERO,
  faucetContractAddress: EthAddress.ZERO,
};

function getStartupConfigEnvVars(): Partial<StartupConfig> {
  const { ETHEREUM_HOST, PORT, API_PREFIX, TYPEORM_LOGGING, ALLOW_PRIVILEGED_METHODS } = process.env;

  const envVars: Partial<StartupConfig> = {
    port: PORT ? +PORT : undefined,
    ethereumHost: ETHEREUM_HOST,
    apiPrefix: API_PREFIX,
    typeOrmLogging: TYPEORM_LOGGING ? TYPEORM_LOGGING === 'true' : undefined,
    allowPrivilegedMethods: ALLOW_PRIVILEGED_METHODS ? ALLOW_PRIVILEGED_METHODS === 'true' : undefined,
  };
  return Object.fromEntries(Object.entries(envVars).filter(e => e[1] !== undefined));
}

export interface ConfVars extends StartupConfig {
  redeployConfig: RedeployConfig;
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

    if (pathExistsSync(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = this.readConfigFile(this.confPath);

      // Priorities:
      // StartupConfig: Environment, saved, defaults.
      // RedeployConfig: Don't take from the given environment
      const { redeployConfig: savedRedeployConfig, ...savedStartupConfig } = saved;
      this.confVars = {
        ...defaultStartupConfig,
        ...savedStartupConfig,
        ...startupConfigEnvVars,
        redeployConfig: {
          ...defaultRedeployConfig,
          ...savedRedeployConfig,
        },
      };
    } else {
      // Priorities:
      // StartupConfig: Environment, defaults.
      // RedeployConfig: Just take the default
      this.confVars = {
        ...defaultStartupConfig,
        ...startupConfigEnvVars,
        redeployConfig: {
          ...defaultRedeployConfig,
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
      redeployConfig: {
        ...conf.redeployConfig,
        rollupContractAddress: conf.redeployConfig.rollupContractAddress
          ? EthAddress.fromString(conf.redeployConfig.rollupContractAddress)
          : EthAddress.ZERO,
        permitHelperContractAddress: conf.redeployConfig.permitHelperContractAddress
          ? EthAddress.fromString(conf.redeployConfig.permitHelperContractAddress)
          : EthAddress.ZERO,
        feeDistributorAddress: conf.redeployConfig.feeDistributorAddress
          ? EthAddress.fromString(conf.redeployConfig.feeDistributorAddress)
          : EthAddress.ZERO,
        faucetContractAddress: conf.redeployConfig.faucetContractAddress
          ? EthAddress.fromString(conf.redeployConfig.faucetContractAddress)
          : EthAddress.ZERO,
        priceFeedContractAddresses: conf.redeployConfig.priceFeedContractAddresses
          ? conf.redeployConfig.priceFeedContractAddresses.map(EthAddress.fromString)
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
      redeployConfig: {
        ...conf.redeployConfig,
        rollupContractAddress: conf.redeployConfig.rollupContractAddress?.toString(),
        permitHelperContractAddress: conf.redeployConfig.permitHelperContractAddress?.toString(),
        feeDistributorAddress: conf.redeployConfig.feeDistributorAddress?.toString(),
        faucetContractAddress: conf.redeployConfig.faucetContractAddress?.toString(),
        priceFeedContractAddresses: conf.redeployConfig.priceFeedContractAddresses
          ? conf.redeployConfig.priceFeedContractAddresses.map(x => x.toString())
          : undefined,
      },
    };
    writeJsonSync(path, toWrite);
  }

  public saveRedeployConfig(redeployConfig: RedeployConfig) {
    const prevRedeployConfig = this.confVars.redeployConfig;
    this.confVars = {
      ...this.confVars,
      redeployConfig: {
        ...prevRedeployConfig,
        ...redeployConfig,
      },
    };
    this.writeConfigFile(this.confPath, this.confVars);
  }
}
