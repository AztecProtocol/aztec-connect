import React from 'react';
import classnames from 'classnames';
import { Block } from '@aztec/guacamole-ui';
import styles from './display.scss';

export type Text = {
  text: string | Text[];
  color?: string;
  background?: string;
  bold?: boolean;
  blink?: boolean;
};

export const Cursor: Text = {
  text: '▮',
  color: 'white',
  background: 'white',
  blink: true,
};

export interface DisplayProps {
  content: Text[];
}

const renderText = (key: number, { text, color, background, bold, blink }: Text) => {
  let content;
  if (typeof text === 'string') {
    content = text;
  } else {
    content = text.map((t, i) => renderText(i, t));
  }
  const isCursor = blink && color === background && color === 'white';
  const inverseBlink = blink && background && !isCursor;

  return (
    <span
      key={key}
      className={classnames({
        [styles.bold]: bold,
        [styles[`c-${color}`]]: color,
        [styles[`bg-${background}`]]: background,
        [styles.blink]: blink && !inverseBlink,
        [styles['blink-inverse']]: inverseBlink,
      })}
    >
      {content}
    </span>
  );
};

export const Display = ({ content }: DisplayProps) => (
  <Block className={styles.display} padding="xs s">
    {content.map((line, i) => (
      <div key={+i} className={styles.line}>
        <pre>{renderText(i, line)}</pre>
      </div>
    ))}
  </Block>
);
