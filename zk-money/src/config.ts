import { getRollupProviderStatus } from '@aztec/sdk';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S, PerKnownAddress } from 'alt-model/known_assets/known_asset_addresses';
import { toBaseUnits } from './app/units';

export interface Config {
  hostedSdkUrl: string;
  rollupProviderUrl: string;
  explorerUrl: string;
  chainId: number;
  ethereumHost: string;
  mainnetEthereumHost: string;
  txAmountLimits: PerKnownAddress<bigint>;
  sessionTimeout: number;
  debugFilter: string;
}

interface ConfigVars {
  deployTag: string;
  txAmountLimits: string;
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
  txAmountLimits: localStorage.getItem('zm_txAmountLimit') || '',
  sessionTimeout: localStorage.getItem('zm_sessionTimeout') || '',
  debugFilter: localStorage.getItem('zm_debug') ?? '',
});

const fromEnvVars = (): ConfigVars => ({
  deployTag: '',
  txAmountLimits: process.env.REACT_APP_TX_AMOUNT_LIMIT || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  debugFilter: process.env.REACT_APP_DEBUG ?? '',
});

const productionConfig: ConfigVars = {
  deployTag: '',
  txAmountLimits: JSON.stringify([
    `${toBaseUnits('5', 18)}`, // 5 ETH
    `${toBaseUnits('10000', 18)}`, // 10,000 DAI
    `${toBaseUnits('1', 8)}`, // 1 renBTC
    `${toBaseUnits('6', 18)}`, // 6 wstETH
  ]),
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
      return 'https://mainnet-fork.aztec.network:8545';
    default:
      return 'https://mainnet.infura.io/v3/6a04b7c89c5b421faefde663f787aa35';
  }
}

function getInferredDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV !== 'development') {
    return fetch('/DEPLOY_TAG')
      .then(resp => resp.text())
      .catch(() => '');
  } else {
    // Webpack's dev-server would serve up index.html instead of the DEPLOY_TAG.
    return 'aztec-connect-dev';
  }
}

function getDeployConfig(deployTag: string, rollupProviderUrl: string, chainId: number) {
  if (deployTag) {
    const hostedSdkUrl = `https://${deployTag}-sdk.aztec.network`;
    // If this is prod release, we will use the prod domain name.
    const explorerUrl = deployTag.match(/-prod$/)
      ? 'https://explorer.aztec.network'
      : `https://${deployTag}-explorer.aztec.network`;

    const ethereumHost = getEthereumHost(chainId);
    const mainnetEthereumHost = getEthereumHost(1);
    return { hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  } else {
    const hostedSdkUrl = `${window.location.protocol}//${window.location.hostname}:1234`;
    const explorerUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
    const ethereumHost = `${window.location.protocol}//${window.location.hostname}:8545`;
    const mainnetEthereumHost = getEthereumHost(1);
    return { hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  }
}

function getRawConfigWithOverrides() {
  const defaultConfig = process.env.NODE_ENV === 'development' ? developmentConfig : productionConfig;
  return { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };
}

function getRollupProviderUrl(deployTag: string) {
  if (deployTag) return `https://api.aztec.network/${deployTag}/falafel`;
  return `${window.location.protocol}//${window.location.hostname}:8081`;
}

function assembleConfig(
  rawConfig: ReturnType<typeof getRawConfigWithOverrides>,
  deployConfig: ReturnType<typeof getDeployConfig>,
): Config {
  const { txAmountLimits: txAmountLimitsStr, sessionTimeout, debugFilter } = rawConfig;
  const txAmountLimits = JSON.parse(txAmountLimitsStr);

  return {
    ...deployConfig,
    txAmountLimits: {
      [S.ETH]: BigInt(txAmountLimits[0]),
      [S.DAI]: BigInt(txAmountLimits[1]),
      [S.renBTC]: BigInt(txAmountLimits[2]),
      [S.wstETH]: BigInt(txAmountLimits[3]),
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
  };
}
