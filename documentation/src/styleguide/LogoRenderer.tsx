import React from 'react';
import Link from 'react-styleguidist/lib/client/rsg-components/Link';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import AZTECLogo from '../images/aztec-logo-white.png';

const styles = ({ fontFamily }: Rsg.Theme) => ({
  logo: {
    display: 'flex',
    alignItems: 'center',
    margin: 0,
    fontFamily: fontFamily.base,
    fontSize: 18,
    fontWeight: 'normal',
  },
  link: {
    color: '#fff !important',
  },
});

export const LogoRenderer: React.FunctionComponent<JssInjectedProps> = ({ classes, children }) => {
  return (
    <div className={classes.logo}>
      <Link className={classes.link} href="/#/">
        {children || <img width="100%" src={AZTECLogo} />}
      </Link>
    </div>
  );
};

export default Styled<JssInjectedProps>(styles)(LogoRenderer);
