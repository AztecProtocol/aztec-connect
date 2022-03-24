import React from 'react';
import styled from 'styled-components';
import { Text, TextProps } from '../components';
import { colours } from '../styles';
import { BlockStatus, blockStatusColours, blockStatusNames } from './';

export interface BlockStatusTextProps extends TextProps {
  status: BlockStatus;
}

const StyledBlockStatusText = styled(Text)`
  color: ${({ status }: BlockStatusTextProps) => colours[blockStatusColours[status]]};
`;

export const BlockStatusText: React.FunctionComponent<BlockStatusTextProps> = props => (
  <StyledBlockStatusText {...props} text={blockStatusNames[props.status]} />
);
