import React from 'react';
import ReactDOM from 'react-dom';
// import { FlexBox, Block } from '@aztec/guacamole-ui';
// import { App } from './app';
// import { JoinSplitForm } from './join_split_form';
// import './styles/guacamole.css';
import debug from 'debug';
import { TerminalPage, Terminal } from './terminal';
import { createGlobalStyle } from 'styled-components';
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
  .buzz_wrapper{
  position:relative;
  width:700px;
  margin:20px auto;
  background-color:#000;
  overflow:hidden;
  padding: 100px;
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

.buzz_wrapper {
  /* -webkit-animation: jerkwhole 20s infinite; */
  position:relative;
}
@-webkit-keyframes jerkwhole {
  30% {  }
  40% { opacity:1; top:0; left:0;  -webkit-transform:scale(1,1);  -webkit-transform:skew(0,0);}
  41% { opacity:0.8; top:0px; left:-100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(50deg,0);}
  42% { opacity:0.8; top:0px; left:100px; -webkit-transform:scale(1,1.2);  -webkit-transform:skew(-80deg,0);}
  43% { opacity:1; top:0; left:0; -webkit-transform:scale(1,1);  -webkit-transform:skew(0,0);}
  65% { }
}
`;

async function main() {
  debug.enable('bb:*');
  // const app = new App();
  // ReactDOM.render(<LandingPage app={app} />, document.getElementById('root'));
  const terminal = new Terminal(10, 40);
  ReactDOM.render(
    <React.Fragment>
      <GlobalStyle />
      <TerminalPage terminal={terminal} />
    </React.Fragment>,
    document.getElementById('root'),
  );
}

// tslint:disable-next-line:no-console
main().catch(console.error);
