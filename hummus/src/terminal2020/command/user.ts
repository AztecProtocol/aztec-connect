import { App } from '../../app';
import { Text } from '../display';
import { TerminalBuffer } from './terminal_buffer';

const requireInit = async (buf: TerminalBuffer, app: App) => {
  if (!app.isInitialized()) {
    await buf.log([{ text: [{ text: 'Please run ' }, { text: 'init', color: 'cyan' }, { text: ' first.' }] }]);
    return true;
  }
  return false;
};

const logUsage = async (buf: TerminalBuffer, unknown: string = '') => {
  let texts: Text[] = [];
  if (unknown) {
    if (unknown.startsWith('-')) {
      texts.push({ text: `Unknown option: ${unknown}` });
    } else {
      texts.push({ text: `Unknown command: ${unknown}` });
    }
  }
  texts = texts.concat([
    { text: 'usage: user [command] [option]' },
    { text: 'Commands:' },
    { text: '  create                Create new user.' },
    { text: '  switch USER_ID        Switch to another acount.' },
    { text: 'Options:' },
    { text: "  -b                    Show current user's balance." },
    { text: '  -c                    Show current user.' },
    { text: '  -l                    List all users.' },
  ]);
  await buf.log(texts);
};

const run = async (buf: TerminalBuffer, app: App) => {
  switch (buf.argv[1]) {
    case '-h':
    case '--help':
      await logUsage(buf);
      break;
    case '-b': {
      if (await requireInit(buf, app)) return;
      const balance = app.getBalance();
      await buf.log([{ text: `${balance}` }]);
      break;
    }
    case '-c': {
      if (await requireInit(buf, app)) return;
      const user = app.getUser();
      const texts: Text[] = [
        { text: `id: ${user.id}` },
        { text: `public key ${user.publicKey.toString('hex')}` },
        { text: `private key ${user.privateKey!.toString('hex')}` },
      ];
      await buf.log(texts);
      break;
    }
    case '-l': {
      if (await requireInit(buf, app)) return;
      const users = app.getUsers().filter(u => u.privateKey);
      const texts: Text[] = [];
      users.forEach(user => {
        texts.push({ text: `User ${user.id}` });
        texts.push({ text: `  public key ${user.publicKey.toString('hex')}` });
        texts.push({ text: `  private key ${user.privateKey!.toString('hex')}` });
      });
      await buf.log(texts);
      break;
    }
    case 'create': {
      if (await requireInit(buf, app)) return;
      const user = await app.createUser();
      await buf.log([
        { text: 'New user created:' },
        { text: `id: ${user.id}` },
        { text: `public key: ${user.publicKey.toString('hex')}` },
        { text: `private key: ${user.privateKey!.toString('hex')}` },
      ]);
      break;
    }
    case 'switch': {
      if (await requireInit(buf, app)) return;
      const id = +buf.argv[2];
      const user = await app.findUser(id);
      if (!user) {
        await buf.log([{ text: `User id not found: ${id}.` }]);
        return;
      }
      await app.switchToUser(id);
      break;
    }
    default:
      await logUsage(buf, buf.argv[1]);
  }
};

export const user = {
  run,
};
