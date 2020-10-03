import React from 'react';
import cx from 'clsx';
import TypeRenderer from 'react-styleguidist/lib/client/rsg-components/Type';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../../styles/colours';
import { fetchTypeDeclaration } from './fetch_type_declaration';
import { parseTypeDefinition } from './parse_type_definition';

const styles = ({ space, fontSize, fontFamily, color }: Rsg.Theme) => ({
  root: {
    margin: [[space[3], 0]],
    padding: space[3],
    background: colours['grey-lighter'],
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
    padding: [
      [
        space[1],
        0,
        space[1],
        15, // width of 2 chars
      ],
    ],
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
  },
});

interface FunctionTypeProps extends JssInjectedProps {
  srcName: string;
  name: string;
  maxInlineItems?: number;
}

export const FunctionTypeRenderer: React.FunctionComponent<FunctionTypeProps> = ({
  classes,
  srcName,
  name,
  maxInlineItems = 1,
}) => {
  const inputBuffer = fetchTypeDeclaration(srcName);
  const type = parseTypeDefinition(inputBuffer, name, 'function');
  if (!type.length) {
    return null;
  }

  const { name: typeName, params, returns } = type[0];
  const inlineParams = params && params.length <= maxInlineItems;
  return (
    <div className={cx(classes.root, { [classes.inline]: inlineParams })}>
      <div className={classes.inline}>
        <span className={classes.keyword}>{'function '}</span>
        <div className={classes.name}>{typeName}</div>
        {'('}
      </div>
      {params && (
        <div className={classes[inlineParams ? 'inline' : 'block']}>
          {params.map((param, i) => (
            <div key={param.name} className={classes.param}>
              <span className={classes.label}>{`${param.name}: `}</span>
              <TypeRenderer className={classes.type} type={param.type} />
              {(i < params.length - 1 || !inlineParams) && ','}
            </div>
          ))}
        </div>
      )}
      {'): '}
      <TypeRenderer type={returns} maxInlineItems={maxInlineItems} />
      {';'}
    </div>
  );
};

export const FunctionType = Styled<FunctionTypeProps>(styles)(FunctionTypeRenderer);
