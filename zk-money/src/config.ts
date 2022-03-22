import { toBaseUnits } from './app/units';
import { isIOS } from './device_support';
import { getBlockchainStatus } from '@aztec/sdk';
import { KNOWN_MAINNET_ASSET_ADDRESS_STRS as S, PerKnownAddress } from 'alt-model/known_assets/known_asset_addresses';

export interface Config {
  rollupProviderUrl: string;
  explorerUrl: string;
  chainId: number;
  ethereumHost: string;
  mainnetEthereumHost: string;
  priceFeedContractAddresses: PerKnownAddress<string>;
  txAmountLimits: PerKnownAddress<bigint>;
  sessionTimeout: number;
  debug: boolean;
  saveProvingKey: boolean;
  maxAvailableAssetId: number;
}

interface ConfigVars {
  deployTag: string;
  priceFeedContractAddress0: string;
  priceFeedContractAddress1: string;
  priceFeedContractAddress2: string;
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
  priceFeedContractAddress0: localStorage.getItem('zm_priceFeedContractAddress0') || '',
  priceFeedContractAddress1: localStorage.getItem('zm_priceFeedContractAddress1') || '',
  priceFeedContractAddress2: localStorage.getItem('zm_priceFeedContractAddress2') || '',
  txAmountLimits: localStorage.getItem('zm_txAmountLimit') || '',
  sessionTimeout: localStorage.getItem('zm_sessionTimeout') || '',
  maxAvailableAssetId: localStorage.getItem('zm_maxAvailableAssetId') || '',
  debug: !!localStorage.getItem('zm_debug'),
});

const fromEnvVars = (): ConfigVars => ({
  deployTag: '',
  priceFeedContractAddress0: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_0 || '',
  priceFeedContractAddress1: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_1 || '',
  priceFeedContractAddress2: process.env.REACT_APP_PRICE_FEED_CONTRACT_ADDRESS_2 || '',
  txAmountLimits: process.env.REACT_APP_TX_AMOUNT_LIMIT || '',
  sessionTimeout: process.env.REACT_APP_SESSION_TIMEOUT || '',
  maxAvailableAssetId: process.env.REACT_APP_MAX_AVAILABLE_ASSET_ID || '',
  debug: !!process.env.REACT_APP_DEBUG,
});

const productionConfig: ConfigVars = {
  deployTag: '',
  priceFeedContractAddress0: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
  priceFeedContractAddress1: '0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9', // DAI/USD
  priceFeedContractAddress2: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c', // BTC/USD
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
    }
  }

  if (deployTag) {
    const rollupProviderUrl = `https://api.aztec.network/${deployTag}/falafel`;
    // If this is prod release, we will use the prod domain name.
    const explorerUrl = deployTag.match(/-prod$/)
      ? 'https://explorer.aztec.network'
      : `https://${deployTag}.explorer.aztec.network`;
    const chainId = (await getBlockchainStatus(rollupProviderUrl)).chainId;
    const ethereumHost = getEthereumHost(chainId);
    const mainnetEthereumHost = getEthereumHost(1);
    return { rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  } else {
    const rollupProviderUrl = `${window.location.protocol}//${window.location.hostname}:8081`;
    const explorerUrl = `${window.location.protocol}//${window.location.hostname}:3000`;
    const chainId = 1337;
    const ethereumHost = `${window.location.protocol}//${window.location.hostname}:8545`;
    const mainnetEthereumHost = getEthereumHost(1);
    return { rollupProviderUrl, explorerUrl, chainId, ethereumHost, mainnetEthereumHost };
  }
}

export async function getConfig(): Promise<Config> {
  const defaultConfig = process.env.NODE_ENV === 'development' ? developmentConfig : productionConfig;

  const {
    deployTag,
    priceFeedContractAddress0,
    priceFeedContractAddress1,
    priceFeedContractAddress2,
    txAmountLimits: txAmountLimitsStr,
    sessionTimeout,
    maxAvailableAssetId,
    debug,
  } = { ...defaultConfig, ...removeEmptyValues(fromEnvVars()), ...removeEmptyValues(fromLocalStorage()) };

  const txAmountLimits = JSON.parse(txAmountLimitsStr);

  return {
    ...(await getDeployConfig(deployTag)),
    priceFeedContractAddresses: {
      [S.ETH]: priceFeedContractAddress0,
      [S.DAI]: priceFeedContractAddress1,
      [S.renBTC]: priceFeedContractAddress2,
    },
    txAmountLimits: {
      [S.ETH]: BigInt(txAmountLimits[0]),
      [S.DAI]: BigInt(txAmountLimits[1]),
      [S.renBTC]: BigInt(txAmountLimits[2]),
    },
    sessionTimeout: +(sessionTimeout || 1),
    maxAvailableAssetId: +maxAvailableAssetId,
    debug,
    saveProvingKey: !isIOS(),
  };
}
