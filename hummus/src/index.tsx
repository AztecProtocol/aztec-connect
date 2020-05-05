import React from 'react';
import ReactDOM from 'react-dom';
// import { FlexBox, Block } from '@aztec/guacamole-ui';
import { App } from './app';
// import { JoinSplitForm } from './join_split_form';
// import './styles/guacamole.css';
import debug from 'debug';
import { TerminalPage, Terminal } from './terminal';
import { createGlobalStyle } from 'styled-components';
import { MemoryFifo } from 'barretenberg-es/fifo';
import { User } from './user';
require('barretenberg-es/wasm/barretenberg.wasm');

// interface LandingPageProps {
//   app: App;
// }

// function LandingPage({ app }: LandingPageProps) {
//   return (
//     <Block padding="xl" align="center">
//       <FlexBox align="center">
//         <JoinSplitForm app={app} />
//       </FlexBox>
//     </Block>
//   );
// }

const GlobalStyle = createGlobalStyle`
  body {
    background-color: black;
  }
`;

async function main() {
  debug.enable('bb:*');
  const cmdQueue = new MemoryFifo<string>();
  const printQueue = new MemoryFifo<string | undefined>();
  const app = new App();
  // ReactDOM.render(<LandingPage app={app} />, document.getElementById('root'));
  const terminal = new Terminal(12, 40);
  ReactDOM.render(
    <React.Fragment>
      <GlobalStyle />
      <TerminalPage terminal={terminal} />
    </React.Fragment>,
    document.getElementById('root'),
  );

  const printHandler = async () => {
    while (true) {
      const str = await printQueue.get();
      if (str === null) {
        break;
      }
      if (str === undefined) {
        await terminal.prompt();
      } else {
        if (terminal.isPrompting()) {
          await terminal.putString('\r' + str);
          printQueue.put(undefined);
        } else {
          await terminal.putString(str);
        }
      }
    }
  };

  const cmdHandler = async () => {
    while (true) {
      const cmdStr = await cmdQueue.get();
      if (cmdStr === null) {
        break;
      }
      try {
        const [cmd, ...args] = cmdStr.toLowerCase().split(/ +/g);
        if (!app.isInitialised()) {
          switch (cmd) {
            case 'help':
              printQueue.put('init [server]\n');
              break;
            case 'init':
              printQueue.put('initializing...\n');
              await app.init(args[0] || 'http://localhost');
              break;
          }
        } else {
          const userStr = (u: User) =>
            `${u.id}: ${u.publicKey.toString('hex').slice(0, 8)}...` +
            (u.alias ? ` (${u.alias})` : '') +
            (u.privateKey ? ' *' : '') +
            '\n';

          switch (cmd) {
            case 'help':
              printQueue.put(
                'deposit <amount>\n' +
                  'withdraw <amount>\n' +
                  'transfer <to> <amount>\n' +
                  'balance [id/alias]\n' +
                  'user [id/alias]\n' +
                  'adduser <alias> [pubkey]\n',
              );
              break;
            case 'deposit':
              printQueue.put(`generating deposit proof...\n`);
              await app.deposit(+args[0]);
              printQueue.put(`deposit proof sent.\n`);
              break;
            case 'withdraw':
              printQueue.put(`generating withdrawl proof...\n`);
              await app.withdraw(+args[0]);
              printQueue.put(`withdrawl proof sent.\n`);
              break;
            case 'transfer': {
              const user = app.findUser(args[0], true);
              if (!user) {
                throw new Error('User not found.');
              }
              printQueue.put(`generating transfer proof...\n`);
              await app.transfer(+args[1], user.publicKey);
              printQueue.put(`transfer proof sent.\n`);
              break;
            }
            case 'balance':
              await terminal.putString(`${app.getBalance(args[0])}\n`);
              break;
            case 'user':
              if (args[0]) {
                const user = app.switchToUser(args[0]);
                printQueue.put(
                  `switched to ${user.publicKey.toString('hex').slice(0, 8)}...\nbalance ${app.getBalance()}\n`,
                );
              } else {
                const str = app.getUsers().map(userStr).join('');
                printQueue.put(str);
              }
              break;
            case 'adduser': {
              if (args.length === 1) {
                const user = await app.createUser(args[0]);
                printQueue.put(userStr(user));
                break;
              } else {
                const publicKey = Buffer.from(args[1], 'hex');
                if (publicKey.length !== 64) {
                  throw new Error('Bad public key.');
                }
                const user = await app.addUser(args[0], publicKey);
                printQueue.put(userStr(user));
              }
              break;
            }
          }
        }
      } catch (err) {
        printQueue.put(err.message + '\n');
      }
      printQueue.put(undefined);
    }
  };

  cmdHandler();
  printHandler();
  await new Promise(resolve => setTimeout(resolve, 2000));
  printQueue.put("aztec zero knowledge terminal.\x01\ntype command or 'help'\n");
  printQueue.put(undefined);
  terminal.on('cmd', (cmd: string) => cmdQueue.put(cmd));
  app.on('log', (str: string) => printQueue.put(str));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
