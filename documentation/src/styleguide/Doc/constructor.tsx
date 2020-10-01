import React from 'react';
import cx from 'clsx';
import TypeRenderer from 'react-styleguidist/lib/client/rsg-components/Type';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { Type } from './type';

const styles = ({ space, fontSize, fontFamily, color }: Rsg.Theme) => ({
  root: {
    margin: [[space[3], 0]],
    padding: space[3],
    background: color.codeBackground,
    color: 'rgb(153, 153, 153)', // .token.punctuation
    fontSize: fontSize.h6,
    fontFamily: fontFamily.monospace,
    '& $inline': {
      display: 'flex',
      alignItems: 'center',
    },
  },
  inline: {
    display: 'flex',
    alignItems: 'center',
  },
  block: {
    display: 'block',
    paddingLeft: '13px', // width of 2 chars
  },
  keyword: {
    color: color.codeKeyword,
    marginRight: space[2],
  },
  name: {
    color: color.name,
  },
  type: {},
  param: {
    display: 'flex',
    alignItems: 'center',
    padding: space[1],
    whiteSpace: 'nowrap',
  },
  label: {
    marginRight: space[2],
    fontSize: fontSize.small,
    color: color.codeBase,
  },
});

interface ConstructorProps extends JssInjectedProps {
  name: string;
  params: Type[];
  maxInlineItems?: number;
}

export const ConstructorRenderer: React.FunctionComponent<ConstructorProps> = ({
  classes,
  name,
  params,
  maxInlineItems = 1,
}) => {
  const inlineParams = params.length <= maxInlineItems;
  return (
    <div className={cx(classes.root, { [classes.inline]: inlineParams })}>
      <div className={classes.inline}>
        <span className={classes.keyword}>{'new '}</span>
        <div className={classes.name}>{name}</div>
        {'('}
      </div>
      <div className={classes[inlineParams ? 'inline' : 'block']}>
        {params.map(({ name, type }, i) => (
          <div key={name} className={classes.param}>
            <span className={classes.label}>{`${name}: `}</span>
            <TypeRenderer className={classes.type} type={type} />
            {(i < params.length - 1 || !inlineParams) && ','}
          </div>
        ))}
      </div>
      {')'}
    </div>
  );
};

export const Constructor = Styled<ConstructorProps>(styles)(ConstructorRenderer);
