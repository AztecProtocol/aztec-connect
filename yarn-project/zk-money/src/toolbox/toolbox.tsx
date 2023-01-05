// import '@rainbow-me/rainbowkit/dist/index.css';
import { LegacyRegisterInteractions } from './legacy_register/index.js';
import { useEffect, useRef, useState } from 'react';
import { getWagmiRainbowConfig } from './wagmi_rainbow_config.js';
import type { Config } from '../config.js';
import { AztecSdk, createAztecSdk, JsonRpcProvider, SdkFlavour } from '@aztec/sdk';
import { WagmiConfig } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { chainIdToNetwork } from '../app/networks.js';
import { RecoverAliasInteractions } from './recover_alias/index.js';
import style from './toolbox.module.scss';
import { DataProviderContentViewer } from './data_provider_content_viewer/index.js';

const TOOLS = [
  { component: RecoverAliasInteractions, label: 'Transfer a trapped pre-June 2021 alias to a new account' },
];
if (process.env.NODE_ENV === 'development') {
  TOOLS.push({ component: LegacyRegisterInteractions, label: 'Register with legacy signing message' });
  TOOLS.push({ component: DataProviderContentViewer, label: 'Fetch DataProvider content' });
}

export function Toolbox({ config }: { config: Config }) {
  const [sdk, setSdk] = useState<AztecSdk>();
  const { rollupProviderUrl, ethereumHost, chainId } = config;
  useEffect(() => {
    const jsonRpcProvider = new JsonRpcProvider(ethereumHost, false);
    createAztecSdk(jsonRpcProvider, {
      serverUrl: rollupProviderUrl,
      flavour: SdkFlavour.PLAIN,
      debug: 'bb:*',
      minConfirmation: chainIdToNetwork(chainId)?.isFrequent ? 1 : undefined,
    }).then(sdk => {
      sdk.run();
      setSdk(sdk);
    });
  }, [ethereumHost, rollupProviderUrl, chainId]);

  const wagmiRainbowConfigRef = useRef<ReturnType<typeof getWagmiRainbowConfig>>();
  if (!wagmiRainbowConfigRef.current) wagmiRainbowConfigRef.current = getWagmiRainbowConfig(config);
  const { wagmiClient, chains } = wagmiRainbowConfigRef.current;

  const [activeToolIdx, setActiveToolIdx] = useState<number>();

  if (!sdk) {
    return <div className={style.root}>Initialising...</div>;
  }

  if (activeToolIdx !== undefined) {
    const ToolComponent = TOOLS[activeToolIdx].component;
    return (
      <div className={style.root}>
        <WagmiConfig client={wagmiClient}>
          <RainbowKitProvider chains={chains}>
            <ToolComponent sdk={sdk} />
          </RainbowKitProvider>
        </WagmiConfig>
      </div>
    );
  }
  return (
    <div className={style.root}>
      <h1>Toolbox</h1>
      {TOOLS.map(({ label }, idx) => (
        <button key={idx} onClick={() => setActiveToolIdx(idx)}>
          {label}
        </button>
      ))}
    </div>
  );
}
