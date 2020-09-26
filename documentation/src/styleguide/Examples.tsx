import { createHash } from 'crypto';
import PropTypes from 'prop-types';
import React from 'react';
import Markdown from 'react-styleguidist/lib/client/rsg-components/Markdown';
import prismTheme from 'react-styleguidist/lib/client/styles/prismTheme';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import * as Rsg from 'react-styleguidist/lib/typings';
import { fontWeightMap, lineHeightMap } from '../styles/typography';
import { colours } from '../styles/colours';
import { AppContext } from './app';
import { DocRenderer, Enum, TypeDefinition } from './Doc';
import SdkPlayground from './SdkPlayground';

export const styles = ({ space, color, fontFamily, fontSize }: Rsg.Theme) => ({
  code: {
    padding: [[space[3], 0, space[5]]],
  },
  playground: {
    padding: [[space[3], 0, space[6]]],
  },
  examples: {
    padding: [[space[2], 0]],
  },
  docSpec: {
    padding: [[space[3], 0]],
  },
  markdown: {
    '& *': {
      wordBreak: 'break-all !important',
    },
    '& ul, ol': {
      margin: '0 !important',
      padding: `${space[3]}px 0 ${space[3]}px ${space[4]}px !important`,
    },
    '& li': {
      padding: [[space[1], 0]],
      fontWeight: fontWeightMap.light,
      '& ul, ol': {
        paddingTop: space[1],
        paddingBottom: space[1],
      },
    },
    '& ol': {
      '& li': {
        listStyle: 'decimal',
      },
    },
    '& em': {
      padding: space[1],
      fontFamily: fontFamily.monospace,
      fontSize: fontSize.small,
      fontStyle: 'normal',
      borderRadius: 4,
      backgroundImage: `linear-gradient(to bottom, transparent 0, ${colours['primary-lightest']} 0)`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100%',
      backgroundPosition: '0 center',
    },
    '& code': {
      padding: [[0, space[0]]],
      fontFamily: fontFamily.monospace,
      fontSize: fontSize.h6,
    },
    '& h1, h2, h3, h4, h5, h6': {
      marginTop: space[3],
    },
    '& h1': {
      padding: [[space[4], 0]],
      fontSize: fontSize.h2,
      lineHeight: lineHeightMap.xl,
      fontWeight: fontWeightMap.light,
    },
    '& h2': {
      padding: [[space[3], 0]],
      fontSize: fontSize.h3,
      lineHeight: lineHeightMap.l,
      fontWeight: fontWeightMap.light,
    },
    '& h3': {
      padding: [[space[3], 0]],
      fontSize: fontSize.h4,
      lineHeight: lineHeightMap.m,
      fontWeight: fontWeightMap.light,
    },
    '& h4': {
      padding: [[space[2], 0]],
      fontSize: fontSize.h5,
      lineHeight: lineHeightMap.s,
      fontWeight: fontWeightMap.normal,
    },
    '& h5': {
      padding: [[space[2], 0]],
      fontSize: fontSize.h6,
      lineHeight: lineHeightMap.xs,
      fontWeight: fontWeightMap.semibold,
    },
    '& h6': {
      padding: [[space[2], 0]],
      fontSize: fontSize.small,
      lineHeight: lineHeightMap.xxs,
      fontWeight: fontWeightMap.bold,
    },
    '& strong': {
      padding: [[0, space[0]]],
      fontFamily: fontFamily.monospace,
      fontSize: fontSize.h6,
      fontWeight: fontWeightMap.semibold,
    },
    '& a': {
      '&, &:active, &:visited': {
        color: `${color.link} !important`,
        fontSize: fontSize.h6,
        cursor: 'pointer !important',
        opacity: 1,
      },
      '& *': {
        cursor: 'pointer !important',
      },
      '&:hover': {
        color: color.link,
      },
    },
    '& table': {
      margin: [[space[3], 0]],
      '& thead': {
        borderBottom: [[1, color.border, 'solid']],
        fontWeight: 300,
      },
      '& th': {
        padding: [[space[1], space[3], space[1], 0]],
        fontSize: fontSize.h6,
        fontWeight: fontWeightMap.normal,
      },
      '& td': {
        padding: [[space[1], space[3], space[1], 0]],
        fontWeight: fontWeightMap.light,
        lineHeight: 1.5,
      },
    },
    '& pre': {
      marginTop: space[4],
      marginBottom: space[4],
      padding: [[space[2], space[3]]],
      backgroundColor: color.codeBackground,
      borderRadius: 4,
      border: 'none',
      fontFamily: fontFamily.monospace,
      fontSize: `${fontSize.small}px !important`,
      lineHeight: 1.5,
      color: 'inherit',
      whiteSpace: 'pre-wrap',
      wordWrap: 'normal',
      tabSize: 2,
      hyphens: 'none',
      ...prismTheme({
        color,
      }),
    },
  },
});

export interface ExamplesProps extends JssInjectedProps {
  examples: Rsg.Example[];
  name?: string;
  exampleMode?: string;
}

const Examples: React.FunctionComponent<ExamplesProps> = ({ classes, examples }) => {
  return (
    <AppContext.Consumer>
      {app => (
        <div className={classes.examples}>
          {examples.map(example => {
            let contentNode;
            switch (example.type) {
              case 'code': {
                const hash = createHash('sha256').update(Buffer.from(example.content)).digest().slice(0, 16);
                contentNode = (
                  <div key={`demo-${hash}`} className={classes.playground}>
                    <SdkPlayground app={app} hash={hash} code={example.content} />
                  </div>
                );
                break;
              }
              case 'markdown': {
                contentNode = [];
                const specPattern = /@spec\s+([\w@-_\/]+(.d)?.ts)\s+(enum|class|interface)?\s*([a-zA-Z]+)/;
                const reg = new RegExp(specPattern, 'g');
                let lastIndex = 0;
                let res;
                while ((res = reg.exec(example.content)) !== null) {
                  if (res.index > lastIndex) {
                    const normalContent = example.content.substring(lastIndex, res.index).trim();
                    if (normalContent) {
                      contentNode.push(
                        <div key={`md_${contentNode.length}`} className={classes.markdown}>
                          <Markdown text={normalContent} />
                        </div>,
                      );
                    }
                    lastIndex = res.index;
                  }
                  const [spec, srcName, isType, decorator, name] =
                    example.content.substr(res.index).match(specPattern) || [];
                  if (decorator === 'enum') {
                    contentNode.push(
                      <div key={`spec_${contentNode.length}`} className={classes.markdown}>
                        <Enum srcName={srcName} enumName={name} />
                      </div>,
                    );
                  } else {
                    contentNode.push(
                      <div key={`spec_${contentNode.length}`} className={classes.docSpec}>
                        {(() => {
                          if (isType) {
                            return <TypeDefinition srcName={srcName} typeName={name} decorator={decorator} />;
                          }
                          return <DocRenderer srcName={srcName} apiName={name} />;
                        })()}
                      </div>,
                    );
                  }
                  lastIndex += spec.length;
                }
                if (lastIndex < example.content.length) {
                  contentNode.push(
                    <div key={`md_${contentNode.length}`} className={classes.markdown}>
                      <Markdown text={example.content.substr(lastIndex)} />
                    </div>,
                  );
                }
                break;
              }
              default:
                return null;
            }

            return contentNode;
          })}
        </div>
      )}
    </AppContext.Consumer>
  );
};

Examples.propTypes = {
  examples: PropTypes.array.isRequired,
  name: PropTypes.string.isRequired,
  exampleMode: PropTypes.string.isRequired,
};

export default Styled<ExamplesProps>(styles)(Examples);
