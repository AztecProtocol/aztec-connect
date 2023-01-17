import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import './ui-components/styles/reset.css';
import './ui-components/styles/global.css';
import { getEnvironment } from './config.js';
import { Views } from './views/index.js';
import { TopLevelContextProvider } from './alt-model/top_level_context/top_level_context_provider.js';
import { AppInitFailed } from './views/app_init_failed.js';
import { getSupportStatus } from './device_support.js';
import { Toolbox } from './toolbox/index.js';
import { getWagmiRainbowConfig } from './toolbox/wagmi_rainbow_config.js';

const PROD_EXPLORER_URL = 'https://aztec-connect-prod-explorer.aztec.network/';

async function rootRender() {
  try {
    const supportStatusProm = getSupportStatus();
    const { config, initialRollupProviderStatus, staleFrontend } = await getEnvironment();
    const { wagmiClient, chains } = getWagmiRainbowConfig(config);
    const supportStatus = await supportStatusProm;
    if (supportStatus !== 'supported') {
      return (
        <BrowserRouter>
          <AppInitFailed reason={{ type: 'unsupported', supportStatus }} explorerUrl={PROD_EXPLORER_URL} />
        </BrowserRouter>
      );
    } else if (staleFrontend) {
      return (
        <BrowserRouter>
          <AppInitFailed reason={{ type: 'stale-frontend' }} explorerUrl={PROD_EXPLORER_URL} />
        </BrowserRouter>
      );
    }
    if (window.location.pathname === '/toolbox') {
      return <Toolbox config={config} />;
    }

    return (
      <WagmiConfig client={wagmiClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: 'white',
            accentColorForeground: 'black',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'none',
          })}
          chains={chains}
        >
          <TopLevelContextProvider config={config} initialRollupProviderStatus={initialRollupProviderStatus}>
            <BrowserRouter>
              <Views config={config} />
            </BrowserRouter>
          </TopLevelContextProvider>
        </RainbowKitProvider>
      </WagmiConfig>
    );
  } catch {
    return (
      <BrowserRouter>
        <AppInitFailed reason={{ type: 'falafel-down' }} explorerUrl={PROD_EXPLORER_URL} />
      </BrowserRouter>
    );
  }
}

async function main() {
  ReactDOM.render(await rootRender(), document.getElementById('root'));
}

main().catch(console.log);
