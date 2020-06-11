import React from 'react';
import styled, { keyframes } from 'styled-components';
import { transparentize } from 'polished';

const colors = {
  black: '#000000',
  white: '#ffffff',
  red: '#c92918',
  green: '#0ccb52',
  yellow: '#f5d318',
  blue: '#2772ce',
  magenta: '#833FB8',
  cyan: '#1dd4d4',
};

type Color = keyof typeof colors;

export type Text = {
  text: string | Text[];
  color?: Color;
  background?: Color;
  bold?: boolean;
  blink?: boolean;
};

export const Cursor: Text = {
  text: '▮',
  color: 'white',
  background: 'white',
  blink: true,
};

const DisplayContainer = styled.div`
  position: relative;
  padding: 4px 8px; // xs s
  width: 100%;
  min-height: 100vh;
  font-size: 14px;
  line-height: 18px;
  background: ${colors.black};
  color: ${colors.white};

  &::before {
    content: ' ';
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(rgba(0, 0, 0, 0) 50%, ${transparentize(0.75, colors.black)} 50%),
      linear-gradient(
        90deg,
        ${transparentize(0.94, '#ff0000')},
        ${transparentize(0.98, '#00ff00')},
        ${transparentize(0.94, '#0000ff')}
      );
    background-size: 100% 2px, 3px 100%;
    pointer-events: none;
    z-index: 2;
  }
`;

const DisplayLine = styled.div`
  min-height: 18px;

  span {
    word-break: break-all;
    white-space: break-spaces;
  }
`;

const blink = keyframes`
  0% {
    opacity: 1;
  }
  25% {
    opacity: 1;
  }
  26% {
    opacity: 0;
  }
  75% {
    opacity: 0;
  }
  76% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
`;

// TODO - should be able to apply to all background and color combinations
const blinkInverse = keyframes`
  0% {
    background-size: 100%;
    color: ${colors.black};
  }
  25% {
    background-size: 100%;
    color: ${colors.black};
  }
  26% {
    background-size: 0;
    color: ${colors.white};
  }
  75% {
    background-size: 0;
    color: ${colors.white};
  }
  76% {
    background-size: 100%;
    color: ${colors.black};
  }
  100% {
    background-size: 100%;
    color: ${colors.black};
  }
`;

type StyledTextProps = {
  color?: Color;
  background?: Color;
  bold?: boolean;
};

const StyledText = styled.span`
  color: ${({ color }: StyledTextProps) => (color ? colors[color] : '')};
  ${({ background }: StyledTextProps) =>
    !background
      ? ''
      : `
    background-repeat: no-repeat;
    background-size: 100%;
    background-position: 0 center;
    background-image: linear-gradient(to bottom, transparent 0, ${colors[background]} 0);
  `}
  font-weight: ${({ bold }: StyledTextProps) => (bold ? 'bold' : '')};
`;

const BlinkText = styled(StyledText)`
  animation: ${blink} 1.2s infinite;
  user-select: none;
`;

const BlinkInverseText = styled(StyledText)`
  animation: ${blinkInverse} 1.2s infinite;
`;

const renderText = (key: number, { text, color, background, bold, blink }: Text) => {
  let content;
  if (typeof text === 'string') {
    content = text;
  } else {
    content = text.map((t, i) => renderText(i, t));
  }
  let Tag;
  if (!blink) {
    Tag = StyledText;
  } else if (color === background && color === 'white') {
    Tag = BlinkText;
  } else {
    Tag = BlinkInverseText;
  }

  return (
    <Tag key={key} color={color} background={background} bold={bold}>
      {content}
    </Tag>
  );
};

interface DisplayProps {
  content: Text[];
}

export const Display = ({ content }: DisplayProps) => (
  <DisplayContainer>
    {content.map((line, i) => (
      <DisplayLine key={+i}>
        <pre>{renderText(i, line)}</pre>
      </DisplayLine>
    ))}
  </DisplayContainer>
);
