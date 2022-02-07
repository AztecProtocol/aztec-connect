import copy from 'copy-to-clipboard';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components/macro';
import { Text } from './text';
import { Tooltip, TooltipPivot } from './tooltip';

const ContentRoot = styled.div`
  cursor: pointer;
`;

interface ClickToCopyProps {
  className?: string;
  text: string;
  hint?: string;
  copiedMessage?: string;
  tooltipPivot?: TooltipPivot;
}

export const ClickToCopy: React.FunctionComponent<ClickToCopyProps> = ({
  className,
  text,
  hint = 'Click to copy',
  copiedMessage = 'Copied',
  tooltipPivot,
  children,
}) => {
  const [justCopied, setJustCopied] = useState(false);

  useEffect(() => {
    let resetTimeout: number;
    if (justCopied) {
      resetTimeout = window.setTimeout(() => {
        setJustCopied(false);
      }, 1500);
    }

    return () => {
      clearTimeout(resetTimeout);
    };
  }, [justCopied, text]);

  const handleCopy = () => {
    copy(text);
    setJustCopied(true);
  };

  const Content = <ContentRoot onClick={handleCopy}>{children}</ContentRoot>;

  return (
    <Tooltip className={className} trigger={Content} pivot={tooltipPivot}>
      <Text text={justCopied ? copiedMessage : hint} size="xxs" nowrap />
    </Tooltip>
  );
};
