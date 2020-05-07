import { App } from '../../app';
import { Text } from '../display';
import { TerminalBuffer, loading } from './terminal_buffer';

const logUsage = async (buf: TerminalBuffer, unknown: string = '') => {
  let texts: Text[] = [];
  if (unknown.startsWith('-')) {
    texts.push({ text: `Unknown option: ${unknown}` });
  }
  texts = texts.concat([{ text: 'usage: init [<options>]' }, { text: '  -S, --server ROLLUP_PROVIDER' }]);
  await buf.log(texts);
};

const run = async (buf: TerminalBuffer, app: App) => {
  const option = buf.argv[1];

  if (option === '-h' || option === '--help') {
    await logUsage(buf);
    return;
  }

  let serverUrl = 'http://localhost';
  if (option) {
    if (['-S', '--server'].indexOf(option) < 0) {
      await logUsage(buf, option);
      return;
    }

    serverUrl = buf.argv[2];
    if (!serverUrl) {
      await buf.log([{ text: 'Missing rollup provider url.' }, { text: `usage: init ${option} ROLLUP_PROVIDER` }]);
      return;
    }
  }

  if (app.initialized()) {
    await buf.log([{ text: 'App already initialized.' }]);
    return;
  }

  const loader = loading(buf);
  loader.start();
  await app.init(serverUrl);
  await loader.stop();
};

export const init = {
  run,
};
