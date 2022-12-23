import { DataProviderWrapper } from '../../bridge-clients/client/aztec/data-provider/DataProvider.js';
import { EthAddress } from '@aztec/sdk';
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

async function fetchData(dataProviderAddress: string, rpcUrl: string) {
  const jsonRpcProvider = new StaticJsonRpcProvider(rpcUrl);
  const wrapper = DataProviderWrapper.create(jsonRpcProvider, EthAddress.fromString(dataProviderAddress) as any);
  const assets = await wrapper.getAssets();
  const assetsPod = mapObj(assets, x => x.assetAddress.toString());
  const bridges = await wrapper.getBridges();
  const bridgesPod = mapObj(bridges, x => x.bridgeAddressId);
  return { assets: assetsPod, bridges: bridgesPod };
}

async function fetchAndAssembleData() {
  const dev = await fetchData(
    '0xD25B8B044CE58eaBF41288E223609726A6c98e44',
    'https://aztec-connect-dev-eth-host.aztec.network:8545',
  );
  const test = await fetchData(
    '0xa33b20ba45ca9c265bbf7b35a75717590edfc868',
    'https://aztec-connect-testnet-eth-host.aztec.network:8545',
  );
  const prod = await fetchData(
    '0x8b2e54fa4398c8f7502f30ac94cb1f354390c8ab',
    'https://aztec-connect-prod-eth-host.aztec.network:8545',
  );
  const assembled = {
    'aztec-connect-dev': dev,
    'aztec-connect-testnet': test,
    'aztec-connect-prod': prod,
  };
  return JSON.stringify(assembled, null, 2);
}
