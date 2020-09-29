import React from 'react';
import PropTypes from 'prop-types';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import Markdown from 'react-styleguidist/lib/client/rsg-components/Markdown';
import { lineHeightMap, fontWeightMap, codeFontSizeMap } from '../../styles/typography';
import { colours } from '../../styles/colours';

const styles = ({ space, color, fontFamily }: Rsg.Theme) => ({
  root: {
    marginTop: -space[2],
  },
  description: {
    '& p, ul': {
      padding: [[space[1], 0]],
      lineHeight: lineHeightMap.xs,
      fontWeight: fontWeightMap.light,
      color: color.base,
    },
    '& ul': {
      marginLeft: space[4],
    },
    '& li': {
      fontSize: 'inherit',
      lineHeight: 'inherit',
      color: 'inherit',
      listStyleType: 'disc outside',
    },
    '& p, ul, div': {
      // override the styles in ParaRenderer
      '& em': {
        fontFamily: fontFamily.monospace,
        fontSize: `${codeFontSizeMap.s} !important`,
        padding: space[1],
        borderRadius: space[0],
        backgroundImage: `linear-gradient(to bottom, transparent 0, ${colours['primary-lightest']} 0)`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100%',
        backgroundPosition: '0 center',
      },
      '& code': {
        fontFamily: fontFamily.monospace,
        fontSize: `${codeFontSizeMap.xs} !important`,
      },
      '& a': {
        color: `${color.link} !important`,
        cursor: 'pointer !important',
      },
    },
  },
});

interface DescriptionProps extends JssInjectedProps {
  description: string;
}

const Description: React.FunctionComponent<DescriptionProps> = ({ classes, description }) => (
  <div className={classes.root}>
    <div className={classes.description}>
      <Markdown text={description} />
    </div>
  </div>
);

Description.propTypes = {
  classes: PropTypes.objectOf(PropTypes.string.isRequired).isRequired,
  description: PropTypes.string.isRequired,
};

export default Styled<DescriptionProps>(styles)(Description);
