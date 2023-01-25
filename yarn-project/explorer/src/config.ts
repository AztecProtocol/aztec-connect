import { BlockchainStatus, getRollupProviderStatus } from '@aztec/sdk';

export const ACCEPTABLE_DEPLOY_TAGS = [
  'aztec-connect-prod',
  'aztec-connect-dev',
  'aztec-connect-stage',
  'aztec-connect-testnet',
  'localhost',
];

export interface Network {
  deployTag: string;
  name: string;
  baseUrl: string;
  endpoint: string;
  etherscanUrl: string;
  blockchainStatus: BlockchainStatus;
}

async function getInferredDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV !== 'development') {
    const resp = await fetch('/DEPLOY_TAG');
    const text = await resp.text();
    return text.replace('\n', '');
  } else {
    return '';
  }
}

export async function getNetwork(): Promise<Network> {
  const deployTag = await getInferredDeployTag();

  const rollupProviderUrl = deployTag ? `https://api.aztec.network/${deployTag}/falafel` : 'http://localhost:8081';
  const endpoint = `${rollupProviderUrl}`;
  const { blockchainStatus } = await getRollupProviderStatus(rollupProviderUrl);
  const { chainId } = blockchainStatus;

  if (!deployTag || chainId === 1337) {
    return {
      deployTag,
      name: 'ganache',
      baseUrl: '/ganache',
      endpoint,
      etherscanUrl: '',
      blockchainStatus,
    };
  }

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1:
        return 'mainnet';
      case 0xdef:
        return 'devnet';
      case 0x57a93:
        return 'stage';
      case 0xa57ec:
        return 'testnet';
      default:
        throw new Error(`Unknown chain id: ${chainId}`);
    }
  };

  return {
    deployTag,
    name: getChainName(chainId),
    baseUrl: '',
    endpoint,
    etherscanUrl: chainId == 1 ? 'https://etherscan.io' : '',
    blockchainStatus,
  };
}

export const POLL_INTERVAL = 5000;
