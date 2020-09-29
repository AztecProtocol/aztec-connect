import React from 'react';
import PropTypes from 'prop-types';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { lineHeightMap, fontWeightMap } from '../styles/typography';

export const styles = ({ fontSize, space, color, fontFamily }: Rsg.Theme) => ({
  para: {
    padding: [[space[1], 0]],
    color: color.base,
    fontFamily: fontFamily.base,
    fontWeight: fontWeightMap.light,
    fontSize: fontSize.h5,
    lineHeight: lineHeightMap.s,
    wordBreak: 'break-word !important',
    '& a': {
      color: color.link,
    },
    '& > span': {
      display: 'block',
      marginTop: space[1],
      marginBottom: space[1],
      fontSize: fontSize.small,
      lineHeight: 1,
    },
  },
});

interface ParaProps extends JssInjectedProps {
  semantic?: 'p';
  children: React.ReactNode;
}

export const ParaRenderer: React.FunctionComponent<ParaProps> = ({ classes, semantic, children }) => {
  const Tag = semantic || 'div';

  return <Tag className={classes.para}>{children}</Tag>;
};

ParaRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  semantic: PropTypes.oneOf(['p']),
  children: PropTypes.node.isRequired,
};

export default Styled<ParaProps>(styles)(ParaRenderer);
