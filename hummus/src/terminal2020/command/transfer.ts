import { App } from '../../app';
import { Text } from '../display';
import { TerminalBuffer, loading } from './terminal_buffer';

const validOptions = ['-a', '-i', '-k'];

const logUsage = async (buf: TerminalBuffer, msg: string = '') => {
  let texts: Text[] = [];
  if (msg) {
    texts.push({ text: msg });
  }
  texts = texts.concat([
    { text: 'usage: transfer [<option>]' },
    { text: 'Options:' },
    { text: '  -a        Amount.' },
    { text: '  -i        User id.' },
    { text: '  -k        Recipient public key' },
  ]);
  await buf.log(texts);
};

const run = async (buf: TerminalBuffer, app: App) => {
  const { options } = buf;
  if (options['-h'] || options['--help']) {
    await logUsage(buf);
    return;
  }

  if (!app.initialized()) {
    await buf.log([{ text: [{ text: 'Please run ' }, { text: 'init', color: 'cyan' }, { text: ' first.' }] }]);
    return;
  }

  const unknownOption = Object.keys(options).find(opt => validOptions.indexOf(opt) < 0);
  if (unknownOption) {
    await logUsage(buf, `Unknown option: ${unknownOption}`);
    return;
  }

  const unknownValue = Object.keys(options).find(opt => typeof options[opt] !== 'string');
  if (unknownValue) {
    await logUsage(buf, `Unknown value for option ${unknownValue}`);
    return;
  }

  const amount = options['-a'];
  if (typeof amount !== 'string' || !amount.match(/^[1-9][0-9]{0,}$/)) {
    await buf.log([{ text: 'Invalid amount.' }]);
    return;
  }

  let publicKey;
  const id = options['-i'];
  if (options['-k']) {
    publicKey = Buffer.from(options['-k'], 'hex');
  } else if (id) {
    if (!id.match(/^[1-9][0-9]{0,}$/)) {
      await buf.log([{ text: 'Invalid user id.' }]);
      return;
    }
    const user = await app.getUserById(+id);
    if (!user) {
      await buf.log([{ text: `Cannot find user with id ${id}.` }]);
      return;
    }

    publicKey = user.publicKey;
  }
  if (!publicKey) {
    await logUsage(buf, 'Recipient is not defined.');
    return;
  }

  const loader = loading(buf);
  loader.start();
  await app.transfer(parseInt(amount, 10), publicKey);
  await loader.stop();
};

export const transfer = {
  run,
};
