import { BlockchainStatus, getBlockchainStatus } from '@aztec/sdk';

export interface Network {
  name: string;
  baseUrl: string;
  endpoint: string;
  etherscanUrl: string;
  blockchainStatus: BlockchainStatus;
}

async function getDeployTag() {
  // All s3 deployments have a file called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV === 'production') {
    return await fetch('/DEPLOY_TAG').then(resp => resp.text());
  } else {
    return 'aztec-connect-dev';
  }
}

export async function getNetwork(): Promise<Network> {
  const deployTag = await getDeployTag();

  const rollupProviderUrl = deployTag ? `https://api.aztec.network/${deployTag}/falafel` : 'http://localhost:8081';
  const endpoint = `${rollupProviderUrl}/graphql`;
  const blockchainStatus = await getBlockchainStatus(rollupProviderUrl);
  const { chainId } = blockchainStatus;

  if (!deployTag || chainId === 1337) {
    return {
      name: 'ganache',
      baseUrl: '/ganache',
      endpoint,
      etherscanUrl: '',
      blockchainStatus,
    };
  }

  switch (chainId) {
    case 5:
      return {
        name: 'goerli',
        baseUrl: '/goerli',
        endpoint,
        etherscanUrl: 'https://goerli.etherscan.io',
        blockchainStatus,
      };
    case 0xa57ec:
      return {
        name: 'mainnet-fork',
        baseUrl: '',
        endpoint,
        etherscanUrl: '',
        blockchainStatus,
      };
    case 1:
      return {
        name: 'mainnet',
        baseUrl: '',
        endpoint,
        etherscanUrl: 'https://etherscan.io',
        blockchainStatus,
      };
    default:
      throw new Error(`Unknown chain id: ${chainId}`);
  }
}

export const POLL_INTERVAL = 5000;
