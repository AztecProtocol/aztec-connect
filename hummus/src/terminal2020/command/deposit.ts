import { App } from '../../app';
import { TerminalBuffer, loading } from './terminal_buffer';

const run = async (buf: TerminalBuffer, app: App) => {
  const option = buf.argv[1];

  if (!option || option === '-h' || option === '--help') {
    await buf.log([{ text: 'usage: deposit AMOUNT' }]);
    return;
  }

  if (!app.isInitialized()) {
    await buf.log([{ text: [{ text: 'Please run ' }, { text: 'init', color: 'cyan' }, { text: ' first.' }] }]);
    return;
  }

  if (!option.match(/^[1-9][0-9]{0,}$/)) {
    await buf.log([{ text: 'Invalid amount.' }]);
    return;
  }

  const loader = loading(buf);
  loader.start();
  const amount = parseInt(option, 10);
  await app.deposit(amount);
  await loader.stop();
};

export const deposit = {
  run,
};
