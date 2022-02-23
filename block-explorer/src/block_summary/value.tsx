import React from 'react';
import styled from 'styled-components';
import { contentPlaceholderStyle, Text, TextProps } from '../components';
import { Icon } from '../components/icon';
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

const ValueWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

interface ValueProps extends TextProps {
  className?: string;
  icon?: string;
}

export const Value: React.FunctionComponent<ValueProps> = ({ className, icon, ...textProps }) => (
  <ValueWrapper>
    {icon && <Icon icon={icon} theme={'tertiary'} size={'s'} />}
    <ValueText className={className} size="xs" weight="light" {...textProps} />
  </ValueWrapper>
);
