import React from 'react';
import { Colour, colours } from '../../styles/colour.js';
import { FontSize, FontWeight, fontSizes, lineHeights, fontWeights } from '../../styles/typography.js';
import { bindStyle } from '../../../ui-components/util/classnames.js';
import style from './text_area.module.scss';

const cx = bindStyle(style);

export type TextAreaColour = Colour | 'gradient';

export interface TextAreaProps {
  className?: string;
  size?: FontSize;
  weight?: FontWeight;
  color?: TextAreaColour;
  italic?: boolean;
  nowrap?: boolean;
  inline?: boolean;
  text?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export const TextArea: React.FunctionComponent<TextAreaProps> = ({
  size = 's',
  weight = 'normal',
  color = 'black',
  className,
  italic,
  nowrap,
  inline,
  text,
  children,
  onClick,
}) => (
  <div
    style={{
      fontSize: fontSizes[size],
      lineHeight: lineHeights[size],
      fontWeight: fontWeights[weight],
      whiteSpace: nowrap ? 'nowrap' : 'initial',
      fontStyle: italic ? 'italic' : 'initial',
      display: inline ? 'inline' : 'initial',
      color: color === 'gradient' ? 'initial' : colours[color],
    }}
    className={cx(style.textWrapper, color === 'gradient' && style.gradient, className)}
    onClick={onClick}
  >
    {text || children}
  </div>
);
