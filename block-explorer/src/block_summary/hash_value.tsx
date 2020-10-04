import React from 'react';
import styled from 'styled-components';
import { contentPlaceholderStyle, ContentSize, CopyButton, Text } from '../components';
import { fontSizes, spacings } from '../styles';

const WIDTH_PER_MONO_CHAR = 8.5;

const truncateValue = (value: string, width: number) => {
  const charNum = Math.floor(width / WIDTH_PER_MONO_CHAR);
  return charNum >= value.length ? value : `${value.slice(0, charNum - 3 - 6)}...${value.slice(-6)}`;
};

export const HashValuePlaceholder = styled.div`
  position: relative;
  width: 100%;
  height: 28px;

  &:after {
    ${contentPlaceholderStyle}
    content: '';
    position: absolute;
    top: ${(28 - parseInt(fontSizes.s)) / 2}px;
    width: 100%;
    height: ${fontSizes.s};
  }
`;

const Root = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.xxs} 0;
  line-height: 1;
`;

const Value = styled.div`
  flex: 1 1 auto;
  padding-right: ${spacings.xs};
`;

interface HashValueProps {
  className?: string;
  value: string;
}

export const HashValue: React.FunctionComponent<HashValueProps> = ({ className, value }) => {
  return (
    <Root className={className}>
      <Value>
        <ContentSize>
          {({ width }) => <Text text={truncateValue(value, width)} size="xs" weight="light" monospace />}
        </ContentSize>
      </Value>
      <CopyButton value={value} />
    </Root>
  );
};
