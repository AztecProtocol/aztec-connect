import { App } from '../../app';
import { TerminalBuffer } from './terminal_buffer';
import { help } from './help';
import { init } from './init';
import { user } from './user';
import { deposit } from './deposit';
import { withdraw } from './withdraw';
import { transfer } from './transfer';

export interface Command {
  run: (buf: TerminalBuffer, app: App) => Promise<void>;
}

export const toArgv = (value: string) => value.split(' ').filter(t => !!t);

export const toOptions = (argv: string[]) => {
  const options: { [key: string]: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('-')) {
      const val = argv[i + 1];
      if (val !== undefined && !val.startsWith('-')) {
        i++;
      }
      options[key] = val || 'true';
    }
  }

  return options;
};

const commands: { [name: string]: Command } = {
  help,
  init,
  user,
  deposit,
  withdraw,
  transfer,
};

export const command = async (terminalBuf: TerminalBuffer, app: App) => {
  const name = terminalBuf.argv[0] || '';
  const cmd = commands[name];
  if (!cmd) {
    await terminalBuf.log([
      {
        text: [
          { text: `Command not found: ${name}. Type ` },
          {
            text: 'help',
            color: 'cyan',
          },
          { text: ' for more information.' },
        ],
      },
    ]);
    return;
  }

  return cmd.run(terminalBuf, app);
};
