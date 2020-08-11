import { Rollup, RollupProviderExplorer } from 'aztec2-sdk';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';
import { StatusRow } from './status_row';

interface LatestRollupsProps {
  bindSetter: (setter: (tx: Rollup[]) => void) => void;
  unbindSetter: (setter: (tx: Rollup[]) => void) => void;
  explorer: RollupProviderExplorer;
}

export const LatestRollups = ({ bindSetter, unbindSetter, explorer }: LatestRollupsProps) => {
  const [rollups, setRollups] = useState<Rollup[]>([]);

  useEffect(() => {
    bindSetter(setRollups);

    explorer.getLatestRollups(5).then(setRollups);

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
