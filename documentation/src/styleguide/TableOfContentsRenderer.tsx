import React from 'react';
import PropTypes from 'prop-types';
import Logo from 'react-styleguidist/lib/client/rsg-components/Logo';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';

const styles = ({ space, color, fontFamily, fontSize }: Rsg.Theme) => ({
  root: {
    fontFamily: fontFamily.base,
  },
  logo: {
    paddingTop: space[2],
    paddingLeft: space[2],
    paddingRight: space[2],
  },
  search: {
    padding: [[space[3], space[2]]],
  },
  input: {
    display: 'block',
    width: '100%',
    padding: [[space[2], space[3]]],
    color: '#fff',
    backgroundColor: 'rgba(255,255,255, 0.4)',
    fontSize: fontSize.base,
    border: [[0, color.border, 'solid']],
    borderRadius: '20px',
    transition: 'all ease-in-out .1s',
    '&:focus': {
      isolate: false,
      backgroundColor: 'rgba(255,255,255, 0.8)',
      outline: 0,
      color: color.base,
      '&::placeholder': {
        color: color.base,
        fontWeight: 200,
      },
    },
    '&::placeholder': {
      isolate: false,
      fontSize: fontSize.base,
      color: '#fff',
      fontWeight: 200,
    },
  },
  content: {
    marginLeft: -space[3],
  },
});

interface TableOfContentsRendererProps extends JssInjectedProps {
  children?: React.ReactNode;
  searchTerm: string;
  onSearchTermChange(term: string): void;
}

export const TableOfContentsRenderer: React.FunctionComponent<TableOfContentsRendererProps> = ({
  classes,
  children,
  searchTerm,
  onSearchTermChange,
}) => {
  return (
    <div>
      <div className={classes.root}>
        <nav>
          <div className={classes.logo}>
            <Logo />
          </div>
          <div className={classes.search}>
            <input
              className={classes.input}
              placeholder="Search the docs"
              aria-label="Search the docs"
              value={searchTerm}
              onChange={(event: { target: any }) => onSearchTermChange(event.target.value)}
            />
          </div>
          <div className={classes.content}>{children}</div>
        </nav>
      </div>
    </div>
  );
};

TableOfContentsRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  children: PropTypes.node,
  searchTerm: PropTypes.string.isRequired,
  onSearchTermChange: PropTypes.func.isRequired,
};

export default Styled<TableOfContentsRendererProps>(styles)(TableOfContentsRenderer);
