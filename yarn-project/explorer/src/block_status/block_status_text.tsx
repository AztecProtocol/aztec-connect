import React from 'react';
import { default as styled } from 'styled-components';
import { Text, TextProps } from '../components/index.js';
import { colours } from '../styles/index.js';
import { BlockStatus, blockStatusColours, blockStatusNames } from './index.js';

export interface BlockStatusTextProps extends TextProps {
  status: BlockStatus;
}

const StyledBlockStatusText = styled(Text)`
  color: ${({ status }: BlockStatusTextProps) => colours[blockStatusColours[status]]};
`;

export const BlockStatusText: React.FunctionComponent<BlockStatusTextProps> = props => (
  <StyledBlockStatusText {...props} text={blockStatusNames[props.status]} />
);
