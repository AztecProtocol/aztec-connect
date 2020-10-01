import React, { PureComponent } from 'react';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { colours } from '../styles/colours';
import { AppContext, App } from './app';

declare global {
  interface Window {
    web3: any;
    ethereum: any;
    demoArgs: any;
    demoModules: any;
    console: any;
  }
}

const styles = ({ sidebarWidth, mq, space, color }: Rsg.Theme) => ({
  root: {
    color: color.base,
    backgroundColor: color.baseBackground,
  },
  contentWrapper: {},
  sidebar: {
    position: 'fixed',
    left: 0,
    width: sidebarWidth,
    height: '100vh',
    padding: space[3],
    background: `linear-gradient(123deg, ${colours.primary} 0%, ${colours.secondary} 80%)`,
    overflowY: 'scroll',
    color: 'white',
  },
  content: {
    width: '100%',
    maxWidth: 600 + space[5] * 2,
    padding: [[0, space[5]]],
    overflow: 'auto',
    [mq.small]: {
      padding: space[3],
    },
  },
  'content-with-sidebar': {
    marginLeft: sidebarWidth,
    width: `calc(100vw - ${sidebarWidth}px)`,
    padding: [
      [
        '9px', // ugly hack, so that the title can be aligned with logo.
        space[5],
        0,
        space[7],
      ],
    ],
    overflow: 'auto',
    [mq.small]: {
      padding: space[3],
    },
  },
  sections: {
    paddingBottom: space[7],
    width: '100%',
    maxWidth: 600 + sidebarWidth + space[5] + space[7],
    minHeight: '100vh',
  },
});

interface StyleGuideRendererProps extends JssInjectedProps {
  title: string;
  children: React.ReactNode;
  toc?: React.ReactNode;
  hasSidebar?: boolean;
}

class StyleGuideRenderer extends PureComponent<StyleGuideRendererProps> {
  private app: App;

  constructor(props: StyleGuideRendererProps) {
    super(props);
    this.app = new App(window.ethereum);
  }

  render() {
    const { classes, children, toc, hasSidebar } = this.props;
    return (
      <AppContext.Provider value={this.app}>
        <div className={classes.root}>
          <div className={classes.contentWrapper}>
            {hasSidebar && <div className={classes.sidebar}>{toc}</div>}
            <main className={classes[!hasSidebar ? 'content' : 'content-with-sidebar']}>
              <div className={classes.sections}>{children}</div>
            </main>
          </div>
        </div>
      </AppContext.Provider>
    );
  }
}

export default Styled<StyleGuideRendererProps>(styles)(StyleGuideRenderer);
