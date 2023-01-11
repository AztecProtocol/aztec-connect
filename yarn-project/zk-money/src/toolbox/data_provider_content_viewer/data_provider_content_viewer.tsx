import { DataProviderWrapper } from '../../bridge-clients/client/aztec/data-provider/DataProvider.js';
import { EthAddress, getRollupProviderStatus } from '@aztec/sdk';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { useEffect, useState } from 'react';
import { mapObj } from '../../app/util/objects.js';

export function DataProviderContentViewer() {
  const [content, setContent] = useState('');
  useEffect(() => {
    fetchAndAssembleData().then(setContent);
  }, []);
  return (
    <pre style={{ width: '100vw', height: '100vh', textAlign: 'left', fontFamily: 'monospace', fontSize: '12px' }}>
      {content || 'Loading...'}
    </pre>
  );
}

async function fetchData(falafelUrl: string, rpcUrl: string) {
  try {
    const status = await getRollupProviderStatus(falafelUrl);
    const dataProviderAddress = status.blockchainStatus.bridgeDataProvider.toString();
    const jsonRpcProvider = new StaticJsonRpcProvider(rpcUrl);
    const wrapper = DataProviderWrapper.create(jsonRpcProvider, EthAddress.fromString(dataProviderAddress));
    const assets = await wrapper.getAssets();
    const assetsPod = mapObj(assets, x => x.assetAddress.toString());
    const bridges = await wrapper.getBridges();
    const bridgesPod = mapObj(bridges, x => x.bridgeAddressId);
    return { assets: assetsPod, bridges: bridgesPod };
  } catch {
    return;
  }
}

async function fetchAndAssembleData() {
  const localhostProm = fetchData('http://localhost:8081', 'http://localhost:8545');
  const devProm = fetchData(
    'https://api.aztec.network/aztec-connect-dev/falafel',
    'https://aztec-connect-dev-eth-host.aztec.network:8545/INSERT_KEY',
  );
  const testProm = fetchData(
    'https://api.aztec.network/aztec-connect-testnet/falafel',
    'https://aztec-connect-testnet-eth-host.aztec.network:8545/INSERT_KEY',
  );
  const prodProm = fetchData(
    'https://api.aztec.network/aztec-connect-prod/falafel',
    'https://aztec-connect-prod-eth-host.aztec.network:8545',
  );
  const assembled = {
    localhost: await localhostProm,
    'aztec-connect-dev': await devProm,
    'aztec-connect-testnet': await testProm,
    'aztec-connect-prod': await prodProm,
  };
  return JSON.stringify(assembled, null, 2);
}
