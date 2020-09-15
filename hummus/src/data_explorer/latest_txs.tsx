import { Block, Text, TextButton } from '@aztec/guacamole-ui';
import { EthereumSdk, Tx } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../config/context';
import { StatusRow } from './status_row';

interface LatestTxsProps {
  bindSetter: (setter: (tx: Tx[]) => void) => void;
  unbindSetter: (setter: (tx: Tx[]) => void) => void;
  sdk: EthereumSdk;
}

export const LatestTxs = ({ bindSetter, unbindSetter, sdk }: LatestTxsProps) => {
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    bindSetter(setTxs);

    sdk.getLatestTxs(5).then(setTxs);

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
        txs.map(({ txHash, rollup, created }, i) => (
          <Block
            key={txHash.toString('hex')}
            padding="xs 0"
            hasBorderTop={i > 0}
            borderColor={theme === 'light' ? 'grey-lighter' : 'white-lightest'}
          >
            <StatusRow
              alt="Tx"
              iconShape="square"
              id={
                <TextButton
                  text={`0x${txHash.toString('hex').slice(0, 10)}`}
                  href={`/tx/${txHash.toString('hex')}`}
                  color={link}
                  Link={Link}
                />
              }
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
