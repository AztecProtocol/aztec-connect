import { EthereumSdk } from 'aztec2-sdk';
import React, { useEffect, useState } from 'react';
import { FormField } from '../components';

interface EscapeHatchIndicatorProps {
  sdk: EthereumSdk;
}

export const EscapeHatchIndicator = ({ sdk }: EscapeHatchIndicatorProps) => {
  const { escapeHatchMode } = sdk.getSdkOptions();
  const [time, setTime] = useState(new Date().getTime());
  const [isEscapeOpen, setIsEscapeOpen] = useState(false);
  const [numBlocksRemaining, setNumBlocksRemaining] = useState(0);

  useEffect(() => {
    const pollMode = async () => {
      const { escapeOpen, numEscapeBlocksRemaining } = await sdk.getRemoteStatus();
      setIsEscapeOpen(escapeOpen);
      setNumBlocksRemaining(numEscapeBlocksRemaining);

      // wait 10 seconds before updating time and trigging poll again
      await new Promise(resolve => setTimeout(resolve, 10000));
      setTime(new Date().getTime());
      return { escapeOpen, numEscapeBlocksRemaining };
    };

    pollMode();
  }, [time]);

  return (
    <>
      {escapeHatchMode && (
        <>
          <FormField label="Escape hatch open">{`${isEscapeOpen}`}</FormField>
          <FormField label="Blocks until escape hatch open/close">{`${numBlocksRemaining}`}</FormField>{' '}
        </>
      )}
    </>
  );
};
