import { App } from '../../app';
import { TerminalBuffer, loading } from './terminal_buffer';

const run = async (buf: TerminalBuffer, app: App) => {
  const option = buf.argv[1];

  if (!option || option === '-h' || option === '--help') {
    await buf.log([{ text: 'usage: withdraw AMOUNT' }]);
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
  await app.withdraw(app.toNoteValue(option), app.ethProvider.getAccount());
  await loader.stop();
};

export const withdraw = {
  run,
};
