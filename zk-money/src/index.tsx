import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import 'ui-components/styles/reset.css';
import 'ui-components/styles/global.css';
import { getEnvironment } from './config';
import { Views } from './views';
import { TopLevelContextProvider } from 'alt-model/top_level_context/top_level_context_provider';
import { ErrorToast } from 'ui-components/components/layout/global_error_toast';
import { AppInitFailed } from 'views/app_init_failed';
import { getSupportStatus } from 'device_support';

declare global {
  interface Window {
    ethereum: any;
  }
}

async function rootRender() {
  try {
    // TODO: remove this check for launch
    // (similar change required in home.tsx & incentive_modal.tsx)
    const isProdSite = window.location.hostname === 'zk.money';
    if (isProdSite && !localStorage.getItem('unlock_prod')) {
      return (
        <BrowserRouter>
          <AppInitFailed reason={{ type: 'unlaunched' }} />
        </BrowserRouter>
      );
    }
    const supportStatusProm = getSupportStatus();
    const { config, initialRollupProviderStatus } = await getEnvironment();
    const supportStatus = await supportStatusProm;
    if (supportStatus !== 'supported') {
      return (
        <BrowserRouter>
          <AppInitFailed reason={{ type: 'unsupported', supportStatus }} />
        </BrowserRouter>
      );
    }
    return (
      <TopLevelContextProvider config={config} initialRollupProviderStatus={initialRollupProviderStatus}>
        <BrowserRouter>
          <Views config={config} />
        </BrowserRouter>
        <ErrorToast />
      </TopLevelContextProvider>
    );
  } catch {
    return (
      <BrowserRouter>
        <AppInitFailed reason={{ type: 'falafel-down' }} />
      </BrowserRouter>
    );
  }
}

async function main() {
  ReactDOM.render(await rootRender(), document.getElementById('root'));
}

main().catch(console.log);
