import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { fontWeightMap, lineHeightMap } from '../styles/typography';

const styles = ({ space, color, fontFamily, fontSize }: Rsg.Theme) => ({
  heading: {
    margin: 0,
    color: color.base,
    fontFamily: fontFamily.base,
    fontWeight: fontWeightMap.normal,
  },
  heading1: {
    padding: [[space[3], 0]],
    fontSize: fontSize.h1,
    lineHeight: lineHeightMap.xl,
    fontWeight: fontWeightMap.light,
  },
  heading2: {
    padding: [[space[3], 0]],
    fontSize: fontSize.h2,
    lineHeight: lineHeightMap.l,
    fontWeight: fontWeightMap.light,
  },
  heading3: {
    padding: [[space[3], 0]],
    fontSize: fontSize.h3,
    lineHeight: lineHeightMap.m,
  },
  heading4: {
    padding: [[space[2], 0]],
    fontSize: fontSize.h4,
    lineHeight: lineHeightMap.s,
  },
  heading5: {
    padding: [[space[2], 0]],
    fontSize: fontSize.h5,
    lineHeight: lineHeightMap.xs,
    fontWeight: fontWeightMap.semibold,
  },
  heading6: {
    padding: [[space[2], 0]],
    fontSize: fontSize.h6,
    lineHeight: lineHeightMap.xxs,
    fontWeight: fontWeightMap.bold,
  },
});

interface HeadingProps extends JssInjectedProps, React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
  level: number;
}

const HeadingRenderer: React.FunctionComponent<HeadingProps> = ({ classes, level, children, ...props }) => {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  const headingClasses = cx(classes.heading, classes[`heading${level}`]);

  return (
    <Tag {...props} className={headingClasses}>
      {children}
    </Tag>
  );
};

HeadingRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]).isRequired,
  children: PropTypes.node,
};

export default Styled<HeadingProps>(styles)(HeadingRenderer);
