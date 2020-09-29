import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { lineHeightMap } from '../styles/typography';

const styles = ({ fontSize, fontFamily, space }: Rsg.Theme) => ({
  heading: {
    display: 'flex',
    padding: [[space[3], 0]],
    fontFamily,
  },
  'level-1': {
    padding: [[space[4], 0]],
    fontSize: fontSize.h1,
    lineHeight: lineHeightMap.xxl,
  },
  'level-2': {
    fontSize: fontSize.h2,
    lineHeight: lineHeightMap.xl,
  },
  'level-3': {
    fontSize: fontSize.h3,
    lineHeight: lineHeightMap.l,
  },
  'level-4': {
    fontSize: fontSize.h4,
    lineHeight: lineHeightMap.m,
  },
  'level-5': {
    fontSize: fontSize.h5,
    lineHeight: lineHeightMap.s,
  },
  'level-6': {
    fontSize: fontSize.h6,
    lineHeight: lineHeightMap.xs,
  },
  title: {
    flex: '1 1 auto',
  },
});

interface SectionHeadingRendererProps extends JssInjectedProps {
  children?: React.ReactNode;
  toolbar?: React.ReactNode;
  id: string;
  href?: string;
  depth: number;
  deprecated?: boolean;
}

const SectionHeadingRenderer: React.FunctionComponent<SectionHeadingRendererProps> = ({
  classes,
  children,
  id,
  depth,
}) => {
  const headingLevel = Math.min(6, depth);

  return (
    <div id={id} className={cx(classes.heading, classes[`level-${headingLevel}`])}>
      <div className={classes.title}>{children}</div>
    </div>
  );
};

SectionHeadingRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  children: PropTypes.node,
  toolbar: PropTypes.node,
  id: PropTypes.string.isRequired,
  href: PropTypes.string,
  depth: PropTypes.number.isRequired,
  deprecated: PropTypes.bool,
};

export default Styled<SectionHeadingRendererProps>(styles)(SectionHeadingRenderer);
