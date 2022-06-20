import 'reflect-metadata';
import 'source-map-support/register';
import { setPostDebugLogHook } from '@aztec/barretenberg/log';
import { JsonRpcProvider, MemoryFifo, WalletProvider } from '@aztec/sdk';
import { Terminal } from './terminal';
import { TerminalHandler } from './terminal/terminal_handler';
import { TerminalKit } from './terminal_kit';
import { createInterface } from 'readline';

const {
  PRIVATE_KEY = '',
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
} = process.env;

function main() {
  const rows = 12;
  const cols = 40;
  const provider = new WalletProvider(new JsonRpcProvider(ETHEREUM_HOST));
  const terminal = new Terminal(rows, cols);
  const terminalHandler = new TerminalHandler(terminal, provider, {
    debug: 'bb:*',
    serverUrl: ROLLUP_HOST,
  });
  const { stdin, stdout } = process;
  const terminalKit = new TerminalKit(stdout);

  provider.addAccount(Buffer.from(PRIVATE_KEY.replace('0x', ''), 'hex'));

  terminalKit.moveTo(0, 0);
  terminalKit.eraseDisplayBelow();
  terminalKit.hideCursor();
  terminalKit.moveTo(0, rows + 1);
  terminalHandler.start();
  terminal.on('ctrl-c', () => {
    terminalKit.hideCursor(false);
    process.exit(0);
  });
  terminal.on('updated', () => {
    terminalKit.saveCursor();
    terminalKit.moveTo(0, rows);
    terminalKit.eraseLine();
    terminalKit.eraseDisplayAbove();
    terminalKit.moveTo(0, 0);
    terminalKit.white(terminal.asString());
    terminalKit.restoreCursor();
  });

  // If we write a debug line, immediately update the terminal to redraw and prevent it being pushed up.
  setPostDebugLogHook(() => terminal.emit('updated'));

  if (stdin.isTTY) {
    stdin.setRawMode(true);
    stdin.on('data', (key: Buffer) => terminal.rawKeyDown(key[0]));
  } else {
    const rl = createInterface({
      input: stdin,
      crlfDelay: Infinity,
    });
    const queue = new MemoryFifo<string>();
    void queue.process(async cmd => {
      await terminal.awaitPrompting();
      terminal.putInput(cmd);
    });
    rl.on('line', (line: string) => queue.put(line + '\r'));
    rl.on('close', () => queue.put(String.fromCharCode(3)));
  }
}

main();
