import React from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../../styles/colours';

const styles = ({ space, fontSize, borderRadius }: Rsg.Theme) => ({
  tag: {
    display: 'inline-block',
    transform: `translateY(-${space[4]}px)`,
    marginBottom: space[3],
    padding: [[space[0], space[2]]],
    background: colours.blue,
    color: colours.white,
    fontSize: fontSize.small,
    lineHeight: 1,
    borderRadius,
    cursor: 'default',
  },
});

interface TagProps extends JssInjectedProps {
  text: string;
}

export const TagRenderer: React.FunctionComponent<TagProps> = ({ classes, text }) => (
  <div className={classes.tag}>{text}</div>
);

export const Tag = Styled<TagProps>(styles)(TagRenderer);
