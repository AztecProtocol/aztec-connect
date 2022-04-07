import { getBlockchainStatus } from '@aztec/sdk';
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
  debug: boolean;
  maxAvailableAssetId: number;
}

interface ConfigVars {
  deployTag: string;
  txAmountLimits: string;
  sessionTimeout: string;
  maxAvailableAssetId: string;
  debug: boolean;
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
  maxAvailableAssetId: localStorage.getItem('zm_maxAvailableAssetId') || '',
  debug: !!localStorage.getItem('zm_debug'),
});

const fromEnvVars = (): ConfigVars => ({
  deployTag: '',
  txAmountLimits: process.env.REACT_APP_TX_AMOUNT_LIMIT || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  maxAvailableAssetId: process.env.REACT_APP_MAX_AVAILABLE_ASSET_ID || '',
  debug: !!process.env.REACT_APP_DEBUG,
});

const productionConfig: ConfigVars = {
  deployTag: '',
  txAmountLimits: JSON.stringify([
    `${toBaseUnits('30', 18)}`, // 30 ETH
    `${toBaseUnits('100000', 18)}`, // 100000 DAI
    `${toBaseUnits('2', 8)}`, // 2 renBTC
  ]),
  sessionTimeout: '30', // days
  maxAvailableAssetId: '2',
  debug: true,
};

const developmentConfig: ConfigVars = {
  ...productionConfig,
  debug: true,
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

async function getDeployConfig(deployTag: string) {
  if (!deployTag) {
    // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
    // called DEPLOY_TAG in their root containing the deploy tag.
    if (process.env.NODE_ENV !== 'development') {
      deployTag = await fetch('/DEPLOY_TAG')
        .then(resp => resp.text())
        .catch(() => '');
    } else {
      // Webpack's dev-server would serve up index.html instead of the DEPLOY_TAG.
      deployTag = 'aztec-connect-dev';
    }
  }

  if (deployTag) {
    const hostedSdkUrl = `https://${deployTag}-sdk.aztec.network`;
    const rollupProviderUrl = `https://api.aztec.network/${deployTag}/falafel`;
    // If this is prod release, we will use the prod domain name.
    const explorerUrl = deployTag.match(/-prod$/)
      ? 'https://explorer.aztec.network'
      : `https://${deployTag}-explorer.aztec.network`;

    const chainId = (await getBlockchainStatus(rollupProviderUrl)).chainId;
    const ethereumHost = getEthereumHost(chainId);
    const mainnetEthereumHost = getEthereumHost(1);
    return { hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  } else {
    const hostedSdkUrl = `${window.location.protocol}//${window.location.hostname}:1234`;
    const rollupProviderUrl = `${window.location.protocol}//${window.location.hostname}:8081`;
    const explorerUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
    const chainId = 1337;
    const ethereumHost = `${window.location.protocol}//${window.location.hostname}:8545`;
    const mainnetEthereumHost = getEthereumHost(1);
    return { hostedSdkUrl, rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  }
}

export async function getConfig(): Promise<Config> {
  const defaultConfig = process.env.NODE_ENV === 'development' ? developmentConfig : productionConfig;

  const {
    deployTag,
    txAmountLimits: txAmountLimitsStr,
    sessionTimeout,
    maxAvailableAssetId,
    debug,
  } = { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };

  const txAmountLimits = JSON.parse(txAmountLimitsStr);

  return {
    ...(await getDeployConfig(deployTag)),
    txAmountLimits: {
      [S.ETH]: BigInt(txAmountLimits[0]),
      [S.DAI]: BigInt(txAmountLimits[1]),
      [S.renBTC]: BigInt(txAmountLimits[2]),
      [S.wstETH]: BigInt(txAmountLimits[0]),
    },
    sessionTimeout: +(sessionTimeout || 1),
    maxAvailableAssetId: +maxAvailableAssetId,
    debug,
  };
}
