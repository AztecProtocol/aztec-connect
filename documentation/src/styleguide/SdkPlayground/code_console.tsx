import { Hook, Console, Decode, Unhook } from 'console-feed';
import React, { useRef, useState, useEffect } from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../../styles/colours';
import { App, BLOCK_EXPLORER_URL } from '../app';

const PERMITTED_LOGS = ['error', 'info', 'warn'];

const CONSOLE_STYLES = {
  BASE_BACKGROUND_COLOR: 'transparent',
  TABLE_TH_BACKGROUND_COLOR: 'transparent',
  LOG_BACKGROUND: 'transparent',
  LOG_BORDER: 'none',
  LOG_INFO_BACKGROUND: 'transparent',
  LOG_INFO_BORDER: 'none',
  LOG_WARN_ICON: "url('/images/aztec.png')",
  LOG_WARN_COLOR: colours.white,
  LOG_WARN_BACKGROUND: 'transparent',
  LOG_WARN_BORDER: 'none',
  LOG_ERROR_BACKGROUND: 'transparent',
  LOG_ERROR_BORDER: 'none',
};

const slipInExplorerLink = (code: string) =>
  code.replace(
    /await\s+aztecSdk\.awaitSettlement\((?:\n\s)*([^,]+),([^\)]+)\)\s*;/g,
    (awaitSettlement, userId, txHash) =>
      [
        `console.warn('In the meantime, check out the block explorer for more details:', \`${BLOCK_EXPLORER_URL}/tx/$\{${txHash.trim()}.toString('hex')}\`);`,
        awaitSettlement,
      ].join('\n'),
  );

const generateFullCode = (code: string, demoArgs: { [key: string]: any }) => {
  const executableCode = slipInExplorerLink(code).replace(
    /import\s+\{([\w\s,]+)\}\s+from\s+'([\w@-_\/]+)';/g,
    (_, modules, name) => `const {${modules}} = window.demoModules['${name}']`,
  );

  const [, entry, argsList] = executableCode.match(/function\s([^(]*)\(([^)]*)\)/) || [];
  const args = argsList
    ? argsList
        .split(/\s*,\s*/)
        .map(arg => (demoArgs[arg] ? `window.demoArgs['${arg}']` : arg))
        .join(',')
    : '';

  const asyncCompiledCode = `
    ${entry ? executableCode : ''}
    const runCode = async () => {
      try {
        ${entry ? `await ${entry}(${args})` : executableCode}
      } catch(err) {
        console.error(err);
      }
      window.parent.postMessage('EXAMPLE_RAN');
    };
    runCode();
  `;

  return `
    <html>
      <head>
        <script>
          const delayRun = (time) => {
            setTimeout(async () => {
              ${asyncCompiledCode};
            }, time);
          };
          delayRun(500); // wait for hookConsoleLogs to be called
        </script>
      </head>
      <body></body>
    </html>
  `;
};

export const styles = ({ space, fontSize }: Rsg.Theme) => ({
  console: {
    height: '120px',
    padding: space[2],
    background: colours['grey-darker'],
    color: colours.white,
    fontSize: fontSize.small,
    overflowY: 'scroll',
    borderBottom: [[1, 'solid', 'rgba(0, 0, 0, 0.7)']],
    '& a': {
      color: `${colours['primary-light']} !important`,
      cursor: 'pointer',
    },
    '& *': {
      backgroundSize: 'contain',
    },
  },
});

interface CodeConsoleRendererProps extends JssInjectedProps {
  app: App;
  code: string;
  onFinish: () => void;
}

const CodeConsoleRenderer: React.FunctionComponent<CodeConsoleRendererProps> = ({ classes, app, code, onFinish }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const logsRef = useRef<any[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleRef = useRef(null);

  useEffect(() => {
    let unmount = false;

    const hookConsoleLogs = () => {
      const frameConsole = iframeRef.current!.contentWindow!.console;
      Unhook(frameConsole);
      Hook(frameConsole, log => {
        const decodedLog = Decode(log);
        if (PERMITTED_LOGS.indexOf(decodedLog.method) >= 0) {
          // logs will always be the value when useEffect is triggered.
          logsRef.current.push(decodedLog);
          setLogs([...logs, decodedLog]);
          setTimeout(() => {
            // @ts-ignore
            consoleRef.current!.scrollTop = 2000;
          }, 100);
        }
      });
    };

    const compileCodeInIframe = async () => {
      const iframeLoaded = new Promise(resolve => {
        iframeRef.current!.onload = resolve;
      });
      const demoArgs = app.getAvailableArgs();
      iframeRef.current!.srcdoc = generateFullCode(code, demoArgs);
      await iframeLoaded;

      if (!unmount) {
        iframeRef.current!.contentWindow!.demoArgs = demoArgs;
        iframeRef.current!.contentWindow!.demoModules = app.getAvailableModules();
        iframeRef.current!.contentWindow!.ethereum = window.ethereum;
        hookConsoleLogs();
      }

      return new Promise(resolve => {
        window.addEventListener('message', event => {
          if (event.data === 'EXAMPLE_RAN' && !unmount) {
            onFinish();
            resolve(event);
          }
        });
      });
    };

    compileCodeInIframe();

    return () => {
      unmount = true;
      Unhook(iframeRef.current!.contentWindow!.console);
    };
  }, [app]);

  return (
    <div className={classes.console} ref={consoleRef}>
      <iframe ref={iframeRef} title="code" height="0" width="0" style={{ display: 'none' }} />
      <Console
        logs={[...logsRef.current]} // Change array reference to force Console to re-render
        variant="dark"
        styles={CONSOLE_STYLES}
      />
    </div>
  );
};

export const CodeConsole = Styled<CodeConsoleRendererProps>(styles)(CodeConsoleRenderer);
