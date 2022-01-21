import { emptyDir, mkdirp, pathExists, readJson, writeJson } from 'fs-extra';
import { dirname } from 'path';
import { RuntimeConfig } from '@aztec/barretenberg/rollup_provider';

export interface ConfVars {
  port: number;
  rollupContractAddress?: string;
  feeDistributorAddress?: string;
  priceFeedContractAddresses: string[];
  ethereumHost: string;
  ethereumPollInterval?: number;
  halloumiHost?: string;
  privateKey: Buffer;
  numInnerRollupTxs: number;
  numOuterRollupProofs: number;
  apiPrefix: string;
  serverAuthToken: string;
  minConfirmation: number;
  minConfirmationEHW: number;
  typeOrmLogging: boolean;
  proverless: boolean;
  runtimeConfig: RuntimeConfig;
}

function getConfVars(): ConfVars {
  const {
    ROLLUP_CONTRACT_ADDRESS,
    FEE_DISTRIBUTOR_ADDRESS,
    PRICE_FEED_CONTRACT_ADDRESSES,
    ETHEREUM_HOST,
    ETHEREUM_POLL_INTERVAL,
    HALLOUMI_HOST,
    PRIVATE_KEY,
    PORT,
    NUM_INNER_ROLLUP_TXS,
    NUM_OUTER_ROLLUP_PROOFS,
    MIN_CONFIRMATION,
    MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW,
    BASE_TX_GAS,
    PUBLISH_INTERVAL,
    API_PREFIX,
    SERVER_AUTH_TOKEN,
    PROVERLESS,
    TYPEORM_LOGGING,
  } = process.env;

  return {
    port: +(PORT || 8081),
    rollupContractAddress: ROLLUP_CONTRACT_ADDRESS,
    feeDistributorAddress: FEE_DISTRIBUTOR_ADDRESS,
    priceFeedContractAddresses: (PRICE_FEED_CONTRACT_ADDRESSES || '').split(','),
    ethereumHost: ETHEREUM_HOST || '',
    ethereumPollInterval: +(ETHEREUM_POLL_INTERVAL || 10000),
    halloumiHost: HALLOUMI_HOST,
    privateKey: PRIVATE_KEY
      ? Buffer.from(PRIVATE_KEY.slice(2), 'hex')
      : // Test mnemonic account 0.
        Buffer.from('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'hex'),
    numInnerRollupTxs: +(NUM_INNER_ROLLUP_TXS || 1),
    numOuterRollupProofs: +(NUM_OUTER_ROLLUP_PROOFS || 1),
    minConfirmation: +(MIN_CONFIRMATION || 1),
    minConfirmationEHW: +(MIN_CONFIRMATION_ESCAPE_HATCH_WINDOW || 12),
    apiPrefix: API_PREFIX || '',
    serverAuthToken: SERVER_AUTH_TOKEN || '!changeme#',
    typeOrmLogging: !!TYPEORM_LOGGING,
    proverless: !!PROVERLESS,
    runtimeConfig: {
      acceptingTxs: true,
      useKeyCache: false,
      publishInterval: +(PUBLISH_INTERVAL || 0),
      gasLimit: 4000000,
      baseTxGas: +(BASE_TX_GAS || 16000),
      verificationGas: 500000,
      maxFeeGasPrice: 250000000000n,
      feeGasPriceMultiplier: 1,
      maxProviderGasPrice: 250000000000n,
      maxUnsettledTxs: 0,
    },
  };
}

export class Configurator {
  private confVars!: ConfVars;

  constructor(private confPath = './data/config') {}

  /**
   * Builds a launch time configuration from environment variables.
   * If it exists, loads a previous instances configuration from disk.
   * If the rollup contract has changed, empty the entire data dir.
   * Update the configuration with the saved runtime configuration (if it exists).
   * Save the new configuration to disk.
   */
  async init() {
    const dir = dirname(this.confPath);
    await mkdirp(dir);

    this.confVars = getConfVars();

    if (await pathExists(this.confPath)) {
      // Erase all data if rollup contract changes.
      const saved: ConfVars = await this.readConfigFile(this.confPath);
      if (this.confVars.rollupContractAddress && this.confVars.rollupContractAddress !== saved.rollupContractAddress) {
        console.log(
          `Rollup contract changed, erasing data: ${saved.rollupContractAddress} -> ${this.confVars.rollupContractAddress}`,
        );
        await emptyDir(dir);
      }
      // Restore runtime config.
      this.confVars.runtimeConfig = saved.runtimeConfig;
    }

    await this.writeConfigFile(this.confPath, this.confVars);
  }

  public getConfVars() {
    return this.confVars;
  }

  public async saveRuntimeConfig(runtimeConfig: Partial<RuntimeConfig>) {
    this.confVars.runtimeConfig = {
      ...this.confVars.runtimeConfig,
      ...runtimeConfig,
    };
    await this.writeConfigFile(this.confPath, this.confVars);
  }

  /**
   * Loads configuration from file.
   */
  private async readConfigFile(path: string): Promise<ConfVars> {
    const conf = await readJson(path);
    return {
      ...conf,
      runtimeConfig: {
        ...conf.runtimeConfig,
        privateKey: Buffer.from(conf.privateKey, 'hex'),
        maxFeeGasPrice: BigInt(conf.runtimeConfig.maxFeeGasPrice),
        maxProviderGasPrice: BigInt(conf.runtimeConfig.maxProviderGasPrice),
      },
    };
  }

  /**
   * Saves configuration to file. Sets acceptingTxs to true, as it's assumed if the system is restarted,
   * we want to accept txs again when ready.
   */
  private async writeConfigFile(path: string, conf: ConfVars) {
    await writeJson(path, {
      ...conf,
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
