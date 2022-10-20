import React from 'react';
import { default as styled } from 'styled-components';
import { spacings } from '../styles/index.js';
import { GradientBlock } from './gradient_block.js';
import { Text } from './text.js';

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
