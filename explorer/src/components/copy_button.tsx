import classnames from 'classnames';
import copyToClipboard from 'copy-to-clipboard';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import copyIcon from '../images/copy.svg';
import { Text } from './text';

const Button = styled.img`
  width: 16px;
  height: 16px;
  opacity: 0.7;
  cursor: pointer;

  &:hover {
    opacity: 1;
  }
`;

const JustCopied = styled(Text)`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
`;

const CopyButtonRoot = styled.div`
  position: relative;
  flex-shrink: 0;

  &.copied {
    ${Button} {
      pointer-events: none;
      opacity: 0;
    }

    ${JustCopied} {
      opacity: 1;
    }
  }
`;

interface CopyButtonProps {
  className?: string;
  value: string;
}

export const CopyButton: React.FunctionComponent<CopyButtonProps> = ({ className, value }) => {
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
  }, [justCopied]);

  return (
    <CopyButtonRoot className={classnames(className, { copied: justCopied })}>
      <Button
        src={copyIcon}
        alt="+"
        title="Click to copy"
        onClick={() => {
          if (justCopied) return;
          copyToClipboard(value);
          setJustCopied(true);
        }}
      />
      <JustCopied text="Copied!" size="xxs" />
    </CopyButtonRoot>
  );
};
