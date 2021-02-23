import React from 'react';
import styled from 'styled-components';
import { spacings } from '../styles';
import { GradientBlock } from './gradient_block';
import { Text } from './text';

interface RootProps {
  inactive: boolean;
}

const Root = styled(GradientBlock)<RootProps>`
  ${({ inactive }) => inactive && 'opacity: 0.5;'}
  padding: ${spacings.xs} ${spacings.s};
  cursor: pointer;
`;

const Col = styled.div`
  padding: 0 ${spacings.xs};
`;

const IconCol = styled(Col)`
  line-height: 0;
`;

const Icon = styled.img`
  height: 24px;
`;

interface TabProps {
  className?: string;
  icon: string;
  text: string;
  onClick(): void;
  inactive?: boolean;
}

export const Tab: React.FunctionComponent<TabProps> = ({ className, icon, text, onClick, inactive = false }) => (
  <Root className={className} borderRadius="s" inactive={inactive} onClick={onClick}>
    <IconCol>
      <Icon src={icon} />
    </IconCol>
    <Col>
      <Text text={text} color="white" size="m" />
    </Col>
  </Root>
);
