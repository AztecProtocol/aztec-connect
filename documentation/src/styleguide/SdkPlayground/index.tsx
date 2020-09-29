import React, { useState, useEffect } from 'react';
import Editor from 'react-styleguidist/lib/client/rsg-components/Editor';
import Link from 'react-styleguidist/lib/client/rsg-components/Link';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { App } from '../app';
import { EthProviderEvent } from '../eth_provider';
import { CodeConsole } from './code_console';
import { Controls } from './controls';
import { Header } from './header';

const replaceConstInCode = (code: string, app: App) => {
  let modifiedCode = code;
  const varReplacements: { [key: string]: string } = app.getVarReplacements();
  Object.keys(varReplacements).forEach(varName => {
    modifiedCode = modifiedCode.replace(varName, varReplacements[varName]);
  });
  return modifiedCode;
};

export const styles = ({ space, fontSize, fontFamily, color }: Rsg.Theme) => ({
  help: {
    padding: [[space[2], 0]],
    textAlign: 'right',
    fontSize: fontSize.h6,
    color: color.link,
  },
  playground: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  code: {
    position: 'relative',
    pointerEvents: 'all',
    background: color.codeBackground,
    borderLeft: [[1, color.border, 'solid']],
    borderRight: [[1, color.border, 'solid']],
    fontFamily: fontFamily.monospace,
    fontSize: fontSize.small,
    lineHeight: 1.5,
    '& div:first-of-type': {
      // wrap in another level to override the important rules for textarea in Editor
      '& textarea': {
        boxShadow: 'none !important',
        outline: 'none !important',
        border: 'none !important',
        resize: 'none !important',
      },
    },
    '& pre': {
      padding: space[3],
    },
  },
});

interface SdkPlaygroundProps extends JssInjectedProps {
  app: App;
  hash: Buffer;
  code: string;
}

export const SdkPlayground: React.FunctionComponent<SdkPlaygroundProps> = ({ classes, app, hash, code }) => {
  const [liveCode, setLiveCode] = useState(replaceConstInCode(code, app));
  const [codeModified, setCodeModified] = useState(false);
  const [codeRan, setCodeRan] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const replaceAddressInCode = () => {
      setLiveCode(replaceConstInCode(code, app));
    };

    if (!codeModified) {
      app.ethProvider.on(EthProviderEvent.UPDATED_ACCOUNT, replaceAddressInCode);
    }

    return () => {
      app.ethProvider.off(EthProviderEvent.UPDATED_ACCOUNT, replaceAddressInCode);
    };
  }, [app, codeModified]);

  const runCode = () => {
    if (running) return;
    setCodeRan(codeRan + 1);
    setRunning(true);
  };

  const handleUpdateCode = (inputCode: string) => {
    if (running) {
      // react-simple-code-editor, which is used inside Editor, does not update its value when the code is changed through props
      // return;
    }
    if (!codeModified) {
      setCodeModified(true);
    }
    setLiveCode(inputCode);
  };

  return (
    <>
      <div className={classes.help}>
        <Link href="https://discord.gg/wtTgTZk" target="_blank">
          Need help? Join our DISCORD!
        </Link>
      </div>
      <div className={classes.playground}>
        <Header app={app} />
        <div className={classes.code}>
          <Editor code={liveCode} onChange={handleUpdateCode} />
        </div>
        {codeRan > 0 && (
          <CodeConsole key={`${hash}-${codeRan}`} app={app} code={liveCode} onFinish={() => setRunning(false)} />
        )}
        <Controls app={app} runCode={runCode} running={running} />
      </div>
    </>
  );
};

export default Styled<SdkPlaygroundProps>(styles)(SdkPlayground);
