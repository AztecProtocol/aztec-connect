import { Tx } from 'barretenberg-es/rollup_provider';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';
import { StatusRow } from './status_row';

interface LatestTxsProps {
  bindSetter: (setter: (tx: Tx[]) => void) => void;
  unbindSetter: (setter: (tx: Tx[]) => void) => void;
  initialData: Tx[];
}

export const LatestTxs = ({ bindSetter, unbindSetter, initialData }: LatestTxsProps) => {
  const [txs, setTxs] = useState(initialData);

  useEffect(() => {
    bindSetter(setTxs);

    return () => {
      unbindSetter(setTxs);
    };
  }, [bindSetter, unbindSetter]);

  if (!txs.length) {
    return (
      <ThemeContext.Consumer>{({ colorLight }) => <Text text="No data." color={colorLight} />}</ThemeContext.Consumer>
    );
  }

  return (
    <ThemeContext.Consumer>
      {({ theme, link }) =>
        txs.map(({ txId, rollup, created }, i) => (
          <Block
            key={txId}
            padding="xs 0"
            hasBorderTop={i > 0}
            borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
          >
            <StatusRow
              alt="Tx"
              iconShape="square"
              id={<TextButton text={`0x${txId.slice(0, 10)}`} href={`/tx/${txId}`} color={link} Link={Link} />}
              caption={rollup ? ` (Rollup #${rollup.id})` : ''}
              status={rollup ? rollup.status : 'QUEUED'}
              created={created}
            />
          </Block>
        ))
      }
    </ThemeContext.Consumer>
  );
};
