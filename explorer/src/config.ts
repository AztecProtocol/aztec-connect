import { getBlockchainStatus } from '@aztec/sdk';

export interface Network {
  name: string;
  baseUrl: string;
  endpoint: string;
  etherscanUrl: string;
}

export const ganache: Network = {
  name: 'ganache',
  baseUrl: '/ganache',
  endpoint: `${window.location.protocol}//${window.location.hostname}:8081/graphql`,
  etherscanUrl: '',
};

async function getDeployTag() {
  // All s3 deployments have a file called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV === 'production') {
    return await fetch('/DEPLOY_TAG').then(resp => resp.text());
  } else {
    return '';
  }
}

export async function getNetwork(): Promise<Network> {
  const deployTag = await getDeployTag();
  if (!deployTag) {
    return ganache;
  }

  const rollupProviderUrl = `https://api.aztec.network/${deployTag}/falafel`;
  const chainId = (await getBlockchainStatus(rollupProviderUrl)).chainId;
  const endpoint = `https://api.aztec.network/${deployTag}/falafel/graphql`;

  switch (chainId) {
    case 5:
      return {
        name: 'goerli',
        baseUrl: '/goerli',
        endpoint,
        etherscanUrl: 'https://goerli.etherscan.io',
      };
    case 1337:
      return ganache;
    case 0xa57ec:
      return {
        name: 'mainnet-fork',
        baseUrl: '',
        endpoint,
        etherscanUrl: '',
      };
    case 1:
      return {
        name: 'mainnet',
        baseUrl: '',
        endpoint,
        etherscanUrl: 'https://etherscan.io',
      };
    default:
      throw new Error(`Unknown chain id: ${chainId}`);
  }
}

export const POLL_INTERVAL = 5000;
