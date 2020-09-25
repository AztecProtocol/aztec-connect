import React from 'react';
import styled from 'styled-components';
import { contentPlaceholderStyle, Text, TextProps } from '../components';
import { fontSizes, lineHeights } from '../styles';

export const ValuePlaceholder = styled.div`
  position: relative;
  width: 100%;
  height: ${lineHeights.s};

  &:after {
    ${contentPlaceholderStyle}
    content: '';
    position: absolute;
    top: ${(parseInt(lineHeights.s) - parseInt(fontSizes.s)) / 2}px;
    width: 30%;
    height: ${fontSizes.s};
  }
`;

const ValueText = styled(Text)`
  padding: 2px 0;
  line-height: 1;
`;

interface ValueProps extends TextProps {
  className?: string;
}

export const Value: React.FunctionComponent<ValueProps> = ({ className, ...textProps }) => (
  <ValueText className={className} size="xs" weight="light" {...textProps} />
);
