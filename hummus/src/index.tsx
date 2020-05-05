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
/*
.scanline{
  width:100%;
  display:block;
  background:#000;
  height:4px;
  position:relative;
  z-index:3;
  margin-bottom:5px;
  opacity:0.1;
}
.buzz_wrapper span{
  position:absolute;
  -webkit-filter: blur(1px);
  font-size:80px;
  font-family:'Courier new', fixed;
  font-weight:bold;
}
.buzz_wrapper span:nth-child(1){
  color:red;
  margin-left:-2px;
  -webkit-filter: blur(2px);
}
.buzz_wrapper span:nth-child(2){
  color:green;
  margin-left:2px;
  -webkit-filter: blur(2px);
}
.buzz_wrapper span:nth-child(3){
  color:blue;
  position:20px 0;
  -webkit-filter: blur(1px);
}
.buzz_wrapper span:nth-child(4){
  color:#fff;
  -webkit-filter: blur(1px);
  text-shadow:0 0 10px rgba(255,255,255,0.4);
}
.buzz_wrapper span:nth-child(5){
  color:rgba(255,255,255,0.4);
  -webkit-filter: blur(15px);
}

.buzz_wrapper span{
  -webkit-animation: blur 30ms infinite, jerk 50ms infinite;
}

@-webkit-keyframes blur {
  0%   { -webkit-filter: blur(1px); opacity:0.8;}
  50% { -webkit-filter: blur(1px); opacity:1; }
  100%{ -webkit-filter: blur(1px); opacity:0.8; }
}
@-webkit-keyframes jerk {
  50% { left:1px; }
  51% { left:0; }
}
@-webkit-keyframes jerkup {
  50% { top:1px; }
  51% { top:0; }
}

.buzz_wrapper span:nth-child(3){
  -webkit-animation: jerkblue 1s infinite;
}
@-webkit-keyframes jerkblue {
  0% { left:0; }
  30% { left:0; }
  31% { left:10px; }
  32% { left:0; }
  98% { left:0; }
  100% { left:10px; }
}
.buzz_wrapper span:nth-child(2){
  -webkit-animation: jerkgreen 1s infinite;
}
@-webkit-keyframes jerkgreen {
  0% { left:0; }
  30% { left:0; }
  31% { left:-10px; }
  32% { left:0; }
  98% { left:0; }
  100% { left:-10px; }
}*/
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
      const [cmd, ...args] = cmdStr.toLowerCase().split(/ +/g);
      switch (cmd) {
        case 'help':
          printQueue.put('init [server]\ndeposit <amount>\nwithdraw <amount>\nbalance\n');
          break;
        case 'init':
          printQueue.put('initializing...\n');
          await app.init(args[0] || 'http://localhost');
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
        case 'balance':
          await terminal.putString(`${app.getBalance()}\n`);
          break;
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
