import React, { Children } from 'react';
import styled from 'styled-components';
import { TransitionGroup } from '.';

const Root = styled.div`
  display: grid;
  grid-template-areas: 'main';
`;

const Item = styled.div<{ duration: number }>`
  grid-area: main;

  will-change: opacity;
  transition: opacity ${({ duration }) => duration / 1000}s;
  &.mounting,
  &.disappearing {
    opacity: 0;
  }
  &.appearing,
  &.static {
    opacity: 1;
  }
`;

interface CrossFadeProps {
  duration: number;
}

export const CrossFade: React.FunctionComponent<CrossFadeProps> = ({ children, duration }) => {
  return (
    <Root>
      <TransitionGroup duration={duration}>
        {Children.map(children, child => (
          <Item key={(child as any)?.key} duration={duration}>
            {child}
          </Item>
        ))}
      </TransitionGroup>
    </Root>
  );
};
