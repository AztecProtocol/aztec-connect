import { SDK_VERSION, getRollupProviderStatus } from '@aztec/sdk';
import { AssetLabel } from './alt-model/known_assets/known_asset_display_data.js';
import { toBaseUnits } from './app/units.js';

export interface Config {
  deployTag: string;
  hostedSdkUrl: string;
  rollupProviderUrl: string;
  explorerUrl: string;
  chainId: number;
  ethereumHost: string;
  mainnetEthereumHost: string;
  txAmountLimits: Record<AssetLabel, bigint>;
  sessionTimeout: number;
  debugFilter: string;
}

interface ConfigVars {
  deployTag: string;
  sessionTimeout: string;
  debugFilter: string;
}

const removeEmptyValues = (vars: ConfigVars): Partial<ConfigVars> => {
  const nonEmptyVars = { ...vars };
  (Object.keys(vars) as (keyof ConfigVars)[]).forEach(key => {
    if (!vars[key]) {
      delete nonEmptyVars[key];
    }
  });
  return nonEmptyVars;
};

const fromLocalStorage = (): ConfigVars => ({
  deployTag: localStorage.getItem('zm_deployTag') || '',
  sessionTimeout: localStorage.getItem('zm_sessionTimeout') || '',
  debugFilter: localStorage.getItem('zm_debug') ?? '',
});

const fromEnvVars = (): ConfigVars => ({
  deployTag: process.env.REACT_APP_DEPLOY_TAG || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  debugFilter: process.env.REACT_APP_DEBUG ?? '',
});

const productionConfig: ConfigVars = {
  deployTag: '',
  sessionTimeout: '30', // days
  debugFilter: 'zm:*,bb:*',
};

const developmentConfig: ConfigVars = {
  ...productionConfig,
  debugFilter: 'zm:*,bb:*',
};

function getEthereumHost(chainId: number) {
  switch (chainId) {
    case 5:
      return 'https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35';
    case 1337:
      return 'http://localhost:8545';
    case 0xa57ec:
      return 'https://aztec-connect-testnet-eth-host.aztec.network:8545';
    case 0xdef:
      return 'https://aztec-connect-dev-eth-host.aztec.network:8545';
    default:
      return 'https://mainnet.infura.io/v3/ce91afa358e44c758ad70908b5ef0c23';
  }
}

async function getInferredDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV !== 'development') {
    const resp = await fetch('/DEPLOY_TAG');
    const text = await resp.text();
    return text.replace('\n', '');
  } else {
    // Webpack's dev-server would serve up index.html instead of the DEPLOY_TAG.
    return 'aztec-connect-dev';
  }
}

function getDeployConfig(deployTag: string, rollupProviderUrl: string, chainId: number) {
  if (deployTag && deployTag !== 'localhost') {
    const hostedSdkUrl = `https://${deployTag}-sdk.aztec.network`;
    // TODO: use https://explorer.aztec.network on prod once old explorer is switched out
    const explorerUrl = `https://${deployTag}-explorer.aztec.network`;

    const ethereumHost = getEthereumHost(chainId);
    const mainnetEthereumHost = getEthereumHost(1);
    return { deployTag, hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  } else {
    const hostedSdkUrl = `${window.location.protocol}//${window.location.hostname}:1234`;
    const explorerUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
    const ethereumHost = `${window.location.protocol}//${window.location.hostname}:8545`;
    const mainnetEthereumHost = getEthereumHost(1);
    return { deployTag, hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  }
}

function getRawConfigWithOverrides() {
  const defaultConfig = process.env.NODE_ENV === 'development' ? developmentConfig : productionConfig;
  return { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };
}

function getRollupProviderUrl(deployTag: string) {
  if (deployTag && deployTag !== 'localhost') return `https://api.aztec.network/${deployTag}/falafel`;
  return `${window.location.protocol}//${window.location.hostname}:8081`;
}

function assembleConfig(
  rawConfig: ReturnType<typeof getRawConfigWithOverrides>,
  deployConfig: ReturnType<typeof getDeployConfig>,
): Config {
  const { sessionTimeout, debugFilter } = rawConfig;

  return {
    ...deployConfig,
    txAmountLimits: {
      Eth: toBaseUnits('5', 18),
      WETH: 0n, // unused
      DAI: toBaseUnits('10000', 18),
      wstETH: toBaseUnits('6', 18),
      stETH: 0n, // unused
      yvWETH: toBaseUnits('5', 18),
      yvDAI: toBaseUnits('10000', 18),
      weWETH: toBaseUnits('5', 18),
      wewstETH: toBaseUnits('6', 18),
      weDAI: toBaseUnits('10000', 18),
      wa2WETH: toBaseUnits('5', 18),
      wa2DAI: toBaseUnits('12000', 18),
      LUSD: toBaseUnits('10000', 18),
      'TB-275': toBaseUnits('10000', 18),
      'TB-400': toBaseUnits('10000', 18),
    },
    sessionTimeout: +(sessionTimeout || 1),
    debugFilter,
  };
}

export async function getEnvironment() {
  const rawConfig = getRawConfigWithOverrides();
  const deployTag = rawConfig.deployTag || (await getInferredDeployTag());
  const rollupProviderUrl = getRollupProviderUrl(deployTag);
  const initialRollupProviderStatus = await getRollupProviderStatus(rollupProviderUrl);
  const deployConfig = getDeployConfig(
    deployTag,
    rollupProviderUrl,
    initialRollupProviderStatus.blockchainStatus.chainId,
  );
  const config = assembleConfig(rawConfig, deployConfig);
  return {
    config,
    initialRollupProviderStatus,
    staleFrontend: initialRollupProviderStatus.version !== SDK_VERSION,
  };
}
