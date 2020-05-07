import { App } from '../../app';
import { TerminalBuffer } from './terminal_buffer';

const run = async (buf: TerminalBuffer, app: App) => {
  const option = buf.argv[1];

  if (!option || option === '-h' || option === '--help') {
    await buf.log([{ text: 'usage: withdraw AMOUNT' }]);
    return;
  }

  if (!app.initialized()) {
    await buf.log([{ text: [{ text: 'Please run ' }, { text: 'init', color: 'cyan' }, { text: ' first.' }] }]);
    return;
  }

  if (!option.match(/^[1-9][0-9]{0,}$/)) {
    await buf.log([{ text: 'Invalid amount.' }]);
    return;
  }

  await buf.log([{ text: 'Withdrawing...' }]);
  const amount = parseInt(option, 10);
  await app.withdraw(amount);
  await buf.removeLog(1);
};

export const withdraw = {
  run,
};
