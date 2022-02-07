import { rgba } from 'polished';
import React from 'react';
import styled, { keyframes } from 'styled-components/macro';
import bubblePrimary from '../images/bubble_primary.svg';
import bubbleSecondary from '../images/bubble_secondary.svg';
import { colours, spacings } from '../styles';
import { PaddedBlock } from './padded_block';

export enum BubbleTheme {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

const bubbleBase = {
  [BubbleTheme.PRIMARY]: bubblePrimary,
  [BubbleTheme.SECONDARY]: bubbleSecondary,
};

const move = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(220px);
  }
`;

const BubbleRoot = styled(PaddedBlock)`
  display: flex;
  justify-content: center;
`;

const BubbleWrap = styled.div`
  position: relative;
  padding: ${spacings.s} ${spacings.m};
`;

const Bubble = styled.img`
  position: absolute;
  margin-top: 3px; // extra space at the bottom of the svg
  top: 50%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  height: 112px;
`;

const BubbleContent = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const Circle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 100%;
  z-index: 2;
`;

interface CircleProps {
  theme: BubbleTheme;
}

const CircleLeft = styled(Circle)<CircleProps>`
  background-image: ${({ theme }) =>
    theme === BubbleTheme.PRIMARY
      ? 'linear-gradient(0deg, #944af2, #448fff)'
      : 'linear-gradient(0deg, #bcf24a, #44ff6d)'};
`;

const CircleRight = styled(Circle)<CircleProps>`
  background-image: ${({ theme }) =>
    theme === BubbleTheme.PRIMARY
      ? 'linear-gradient(0deg, #4ad4f2, #44ff9a)'
      : 'linear-gradient(0deg, #f24a4a, #ffb444)'};
`;

const DotsRoot = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.s};
`;

const Dot = styled.div`
  margin: 0 ${spacings.xxs};
  width: 4px;
  height: 4px;
  border-radius: 100%;
  background: ${colours.grey};
  opacity: 0.3;
`;

const CargoRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 32px;
  width: 28px;
  height: 28px;
  border-radius: 100%;
  background: ${rgba(colours.black, 0.8)};
  z-index: 1;
  animation: ${move} 2s infinite linear;

  &:before {
    content: '';
    position: absolute;
    left: -${spacings.xxs};
    transform: translateX(-100%);
    width: 16px;
    height: 16px;
    border-radius: 100%;
    background: ${rgba(colours.black, 0.5)};
  }

  &:after {
    content: '';
    position: absolute;
    left: -${parseInt(spacings.xs) + 16}px;
    transform: translateX(-100%);
    width: 8px;
    height: 8px;
    border-radius: 100%;
    background: ${rgba(colours.black, 0.3)};
  }
`;

interface BubbleProps {
  theme?: BubbleTheme;
  icon: string;
}

export const MovingBubble: React.FunctionComponent<BubbleProps> = ({ theme = BubbleTheme.PRIMARY, icon }) => (
  <BubbleRoot size="s">
    <BubbleWrap>
      <Bubble src={bubbleBase[theme]} />
      <BubbleContent>
        <CircleLeft theme={theme} />
        <DotsRoot>
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <Dot key={i} />
            ))}
        </DotsRoot>
        <CircleRight theme={theme} />
        <CargoRoot>
          <img src={icon} alt="" height={16} />
        </CargoRoot>
      </BubbleContent>
    </BubbleWrap>
  </BubbleRoot>
);
