import React from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';

const styles = ({ color }: Rsg.Theme) => ({
  link: {
    color: color.link,
    '&, &:link, &:visited': {
      fontSize: 'inherit',
      color: 'inherit',
      textDecoration: 'none',
      opacity: 0.9,
    },
    '&:hover, &:active': {
      isolate: false,
      opacity: 1,
      cursor: 'pointer',
    },
  },
});

interface LinkProps extends JssInjectedProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  target?: string;
  onClick?: () => void;
}

export const LinkRenderer: React.FunctionComponent<LinkProps> = ({ classes, className, children, ...props }) => {
  return (
    <a {...props} className={cx(classes.link, className)}>
      {children}
    </a>
  );
};

LinkRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  href: PropTypes.string,
};

export default Styled<LinkProps>(styles)(LinkRenderer);
