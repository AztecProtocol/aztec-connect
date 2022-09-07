import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import 'ui-components/styles/reset.css';
import 'ui-components/styles/global.css';
import { getEnvironment } from './config';
import { Views } from './views';
import { TopLevelContextProvider } from 'alt-model/top_level_context/top_level_context_provider';
import { AppInitFailed } from 'views/app_init_failed';
import { getSupportStatus } from 'device_support';
import { Toolbox } from 'toolbox';
import './log_exporter';

const PROD_EXPLORER_URL = 'https://aztec-connect-prod-explorer.aztec.network/';

async function rootRender() {
  try {
    const supportStatusProm = getSupportStatus();
    const { config, initialRollupProviderStatus } = await getEnvironment();
    const supportStatus = await supportStatusProm;
    if (supportStatus !== 'supported') {
      return (
        <BrowserRouter>
          <AppInitFailed reason={{ type: 'unsupported', supportStatus }} explorerUrl={PROD_EXPLORER_URL} />
        </BrowserRouter>
      );
    }
    if (window.location.pathname === '/toolbox') {
      return <Toolbox config={config} />;
    }
    return (
      <TopLevelContextProvider config={config} initialRollupProviderStatus={initialRollupProviderStatus}>
        <BrowserRouter>
          <Views config={config} />
        </BrowserRouter>
      </TopLevelContextProvider>
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
