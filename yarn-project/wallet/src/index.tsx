import ReactDOM from 'react-dom';
import { App } from './min_form.js';
import { enableLogs, getRollupProviderStatus, isLogEnabled } from '@aztec/sdk';

declare global {
  interface Window {
    web3: any;
    ethereum: any;
    aztecSdk: any;
  }
}

async function getDeployTag() {
  // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
  // called DEPLOY_TAG in their root containing the deploy tag.
  if (process.env.NODE_ENV === 'production') {
    return await fetch('/DEPLOY_TAG').then(resp => (resp.ok ? resp.text() : ''));
  } else {
    return '';
  }
}

async function getRollupProviderUrl() {
  if (process.env.ROLLUP_HOST) {
    return process.env.ROLLUP_HOST;
  } else {
    const deployTag = await getDeployTag();
    if (deployTag) {
      return `https://api.aztec.network/${deployTag}/falafel`;
    } else {
      return `${window.location.protocol}//${window.location.hostname}:8081`;
    }
  }
}

function getChainIdRpcHostMap(chainId: number): { [chainId: number]: string } {
  if (process.env.ETHEREUM_HOST) {
    return { [chainId]: process.env.ETHEREUM_HOST };
  } else {
    return {
      1: 'https://mainnet.infura.io/v3/85712ac4df0446b58612ace3ed566352',
      5: 'https://goerli.infura.io/v3/85712ac4df0446b58612ace3ed566352',
      1337: 'http://localhost:8545',
      0xa57ec: 'https://aztec-connect-testnet-eth-host.aztec.network:8545',
      0xdef: 'https://aztec-connect-dev-eth-host.aztec.network:8545',
    };
  }
}

async function main() {
  if (!isLogEnabled('bb:') && process.env.NODE_ENV !== 'production') {
    enableLogs('bb:*');
    location.reload();
  }

  const rollupProviderUrl = await getRollupProviderUrl();

  const {
    blockchainStatus: { chainId },
  } = await getRollupProviderStatus(rollupProviderUrl);
  const rpc = getChainIdRpcHostMap(chainId);

  // const rollupProviderUrl = 'https://bf76-3-8-177-86.ngrok.io';
  // const ethereumHost = 'https://7a23-3-8-177-86.ap.ngrok.io';

  ReactDOM.render(<App chainId={chainId} rpc={rpc} serverUrl={rollupProviderUrl} />, document.getElementById('root'));
}

main().catch(console.log);
