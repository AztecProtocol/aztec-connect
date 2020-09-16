import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { EthereumSdk, Rollup } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../config/context';
import { StatusRow } from './status_row';

interface LatestRollupsProps {
  bindSetter: (setter: (tx: Rollup[]) => void) => void;
  unbindSetter: (setter: (tx: Rollup[]) => void) => void;
  sdk: EthereumSdk;
}

export const LatestRollups = ({ bindSetter, unbindSetter, sdk }: LatestRollupsProps) => {
  const [rollups, setRollups] = useState<Rollup[]>([]);

  useEffect(() => {
    bindSetter(setRollups);

    sdk.getLatestRollups(5).then(setRollups);

    return () => {
      unbindSetter(setRollups);
    };
  }, [bindSetter, unbindSetter]);

  if (!rollups.length) {
    return (
      <ThemeContext.Consumer>{({ colorLight }) => <Text text="No data." color={colorLight} />}</ThemeContext.Consumer>
    );
  }

  return (
    <ThemeContext.Consumer>
      {({ theme, link }) =>
        rollups.map(({ id, txHashes, status, created }, i) => (
          <Block
            key={id}
            padding="xs 0"
            hasBorderTop={i > 0}
            borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
          >
            <StatusRow
              alt="R"
              id={<TextButton text={`#${id}`} href={`/rollup/${id}`} color={link} Link={Link} />}
              caption={`(${txHashes.length} Tx${txHashes.length === 1 ? '' : 's'})`}
              status={status}
              created={created}
            />
          </Block>
        ))
      }
    </ThemeContext.Consumer>
  );
};
