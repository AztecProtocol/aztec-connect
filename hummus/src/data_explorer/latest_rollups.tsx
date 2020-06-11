import { Rollup } from 'barretenberg-es/rollup_provider';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';
import { StatusRow } from './status_row';

interface LatestRollupsProps {
  bindSetter: (setter: (tx: Rollup[]) => void) => void;
  unbindSetter: (setter: (tx: Rollup[]) => void) => void;
  initialData: Rollup[];
}

export const LatestRollups = ({ bindSetter, unbindSetter, initialData }: LatestRollupsProps) => {
  const [rollups, setRollups] = useState(initialData);

  useEffect(() => {
    bindSetter(setRollups);

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
        rollups.map(({ id, txIds, status, created }, i) => (
          <Block
            key={id}
            padding="xs 0"
            hasBorderTop={i > 0}
            borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
          >
            <StatusRow
              alt="R"
              id={<TextButton text={`#${id}`} href={`/rollup/${id}`} color={link} Link={Link} />}
              caption={`(${txIds.length} Tx${txIds.length === 1 ? '' : 's'})`}
              status={status}
              created={created}
            />
          </Block>
        ))
      }
    </ThemeContext.Consumer>
  );
};
