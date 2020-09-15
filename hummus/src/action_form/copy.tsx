import { Block, Icon, Text } from '@aztec/guacamole-ui';
import React, { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { ThemeContext } from '../config/context';

interface CopyProps {
  toCopy: string;
}

export const Copy = ({ toCopy }: CopyProps) => {
  const [justCopied, setJustCopied] = useState(false);

  return (
    <ThemeContext.Consumer>
      {({ theme, link }) => (
        <Block left="m">
          <CopyToClipboard
            text={toCopy}
            onCopy={() => {
              if (justCopied) return;
              setJustCopied(true);
              setTimeout(() => {
                setJustCopied(false);
              }, 1500);
            }}
          >
            <span style={{ position: 'relative', cursor: 'pointer' }} title="Click to copy">
              <Icon name="launch" color={justCopied ? 'transparent' : link} />
              {justCopied && (
                <span style={{ position: 'absolute', left: '-4px' }}>
                  <Text text="Copied!" color={theme === 'dark' ? 'white' : 'green'} size="xxs" />
                </span>
              )}
            </span>
          </CopyToClipboard>
        </Block>
      )}
    </ThemeContext.Consumer>
  );
};
