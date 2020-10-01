import React, { useState } from 'react';
import PropTypes from 'prop-types';
import cx from 'clsx';
import Link from 'react-styleguidist/lib/client/rsg-components/Link';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import { getHash } from 'react-styleguidist/lib/client/utils/handleHash';
import * as Rsg from 'react-styleguidist/lib/typings';
import { fontWeightMap } from '../styles/typography';

const sectionsConfig: { [key: string]: { isStatic?: boolean; disableToggle?: boolean; visibleName?: string } } = {
  Types: {
    isStatic: true,
  },
};

const styles = ({ space, fontSize }: Rsg.Theme) => ({
  root: {
    paddingLeft: space[3],
  },
  item: {
    padding: space[1],
    fontSize: fontSize.h6,
    fontWeight: fontWeightMap.light,
    color: 'white !important',
  },
  label: {
    padding: [[space[1], 0, space[1], space[2]]],
  },
  staticItem: {
    cursor: 'default',
  },
  staticButton: {
    display: 'inline-block',
    cursor: 'pointer',
  },
  link: {
    wordBreak: 'break-word !important',
    color: 'white !important',
  },
  a: {
    color: 'white !important',
  },
  heading: {
    height: '100%',
  },
  selected: {
    fontWeight: fontWeightMap.semibold,
    color: 'white !important',
    '& a': {
      opacity: '1 !important',
    },
  },
  child: {
    fontSize: fontSize.h6,
    color: 'white !important',
  },
});

export interface ComponentListItem extends Rsg.TOCItem {
  visibleName: string;
}

interface ComponentsListRendererProps extends JssInjectedProps {
  items: ComponentListItem[];
}

export const ComponentsListRenderer: React.FunctionComponent<ComponentsListRendererProps> = ({ classes, items }) => {
  const visibleItems = items.filter(item => item.visibleName);
  const defaultOpenItem = items.find(item => item.selected);

  const [isOpen, toggleOpen] = useState<{ [key: string]: boolean }>(
    defaultOpenItem ? { [defaultOpenItem.visibleName]: true } : {},
  );

  if (!visibleItems.length) {
    return null;
  }

  const windowHash = getHash(window.location.hash);
  return (
    <div className={classes.root}>
      {visibleItems.map(({ name, heading, href, visibleName: defaultVisibleName, content, external, initialOpen }) => {
        const { isStatic, disableToggle, visibleName } = sectionsConfig[name!] || {};
        const displayName = visibleName || defaultVisibleName;

        const isChild = !content; // || !content.props.items.length;
        const isItemSelected = !!href && `/#/${windowHash}` === decodeURI(href);
        const isAbleToToggle = !disableToggle && !!heading;
        const showContent =
          isOpen[defaultVisibleName] || disableToggle || (initialOpen && !(defaultVisibleName in isOpen));

        const handleClick = !isAbleToToggle
          ? () => {}
          : () => {
              if (isOpen[defaultVisibleName] && !isItemSelected && !isStatic) return;
              toggleOpen({
                ...isOpen,
                [defaultVisibleName]: defaultVisibleName in isOpen ? !isOpen[defaultVisibleName] : !initialOpen,
              });
            };

        const linkNode = isStatic ? (
          <div className={cx(classes.link, classes.staticButton)} onClick={handleClick}>
            {displayName}
          </div>
        ) : (
          <Link className={classes.link} href={href} target={external ? '_blank' : undefined} onClick={handleClick}>
            {displayName}
          </Link>
        );

        return (
          <div
            key={href}
            className={cx(classes.item, {
              [classes.heading]: heading,
              [classes.child]: isChild,
              [classes.selected]: isItemSelected,
            })}
          >
            <div
              className={cx(classes.label, {
                [classes.staticButton]: isStatic && isAbleToToggle,
                [classes.staticItem]: isStatic && !isAbleToToggle,
              })}
            >
              {linkNode}
            </div>
            {showContent && content}
          </div>
        );
      })}
    </div>
  );
};

ComponentsListRenderer.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  items: PropTypes.array.isRequired,
};

export default Styled<ComponentsListRendererProps>(styles)(ComponentsListRenderer);
