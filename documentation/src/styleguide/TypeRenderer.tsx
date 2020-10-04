import React from 'react';
import cx from 'clsx';
import Styled from 'react-styleguidist/lib/client/rsg-components/Styled';
import { JssInjectedProps } from 'react-styleguidist/lib/client/rsg-components/Styled/Styled';
import Link from 'react-styleguidist/lib/client/rsg-components/Link';
import Name from 'react-styleguidist/lib/client/rsg-components/Name';
import * as Rsg from 'react-styleguidist/lib/typings';
import * as config from '../../styleguide.config';
import { Type } from './Doc/type';

interface Section {
  name: string;
  sections?: Section[];
}

const findSection = (sections: Section[], sectionName: string): Section | undefined => {
  const section = sections.find(s => s.name === sectionName);
  if (section) {
    return section;
  }

  for (const s of sections) {
    const childSection = s.sections ? findSection(s.sections, sectionName) : undefined;
    if (childSection) {
      return childSection;
    }
  }
};

const typeSection = findSection(config.sections as any, 'Types');

const availableTypes = typeSection!.sections!.reduce((types, s) => [...types, s.name], [] as string[]);

const linkStyles = ({ color }: Rsg.Theme) => ({
  text: {
    color: color.type,
  },
  link: {
    color: `${color.type} !important`,
    borderBottom: '1px dashed !important',
  },
});

interface TypeLinkProps extends JssInjectedProps {
  name: string;
}

const TypeLinkRenderer: React.FunctionComponent<TypeLinkProps> = ({ classes, name }) => {
  if (availableTypes.indexOf(name) < 0) {
    return <span className={classes.text}>{name}</span>;
  }

  return (
    <Link className={classes.link} href={`/#/Types/${name}`}>
      {name}
    </Link>
  );
};

const TypeLink = Styled<TypeProps>(linkStyles)(TypeLinkRenderer);

const paramsStyles = ({ space }: Rsg.Theme) => ({
  inline: {
    display: 'flex',
    alignItems: 'center',
  },
  block: {
    display: 'block',
    paddingTop: space[1],
    paddingBottom: space[1],
    paddingLeft: '13px', // width of 2 chars
    '& > $param': {
      padding: [[space[1], space[0]]],
      whiteSpace: 'nowrap',
    },
  },
  param: {
    display: 'flex',
    alignItems: 'center',
    padding: [[0, space[0]]],
    whiteSpace: 'nowrap',
  },
  paramBlock: {
    display: 'flex',
    flexDirection: 'column',
    padding: [[space[1], space[0]]],
  },
  label: {
    marginRight: space[1],
    whiteSpace: 'nowrap',
  },
  symbol: {
    whiteSpace: 'nowrap',
  },
});

interface ParamsRendererProps extends JssInjectedProps {
  params: Type[];
  maxInlineItems: number;
}

const ParamsRenderer: React.FunctionComponent<ParamsRendererProps> = ({ classes, params, maxInlineItems }) => {
  const inlineParams = params.length <= maxInlineItems;
  return (
    <div className={classes[inlineParams ? 'inline' : 'block']}>
      {params.map(({ name, type }, i) => {
        // TODO - deal with object type and more complicated return type
        if (typeof type === 'object' && type.type === 'function') {
          return (
            <div
              key={`${name}_${i}`}
              className={classes[type.params!.length <= maxInlineItems ? 'param' : 'paramBlock']}
            >
              <span className={classes.label}>{`${name}: (`}</span>
              <Params params={type.params} maxInlineItems={maxInlineItems} />
              <span className={classes.symbol}>
                {') => '}
                <TypeContent type={type.returns} maxInlineItems={maxInlineItems} />
                {(i < params.length - 1 || !inlineParams) && ','}
              </span>
            </div>
          );
        }
        return (
          <div key={`${name}_${i}`} className={classes.param}>
            <span className={classes.label}>{`${name}: `}</span>
            <TypeContent type={type} maxInlineItems={maxInlineItems} />
            {(i < params.length - 1 || !inlineParams) && <span className={classes.symbol}>{','}</span>}
          </div>
        );
      })}
    </div>
  );
};

const Params = Styled<TypeProps>(paramsStyles)(ParamsRenderer);

const contentStyles = ({ space }: Rsg.Theme) => ({
  inline: {
    display: 'flex',
    alignItems: 'center',
  },
  or: {
    padding: [[0, space[1]]],
  },
});

interface TypeContentProps extends JssInjectedProps {
  type: string | Type;
  maxInlineItems: number;
  showReturnType?: boolean;
}

const TypeContentRenderer: React.FunctionComponent<TypeContentProps> = ({
  classes,
  type,
  maxInlineItems,
  showReturnType = true,
}) => {
  if (typeof type === 'string') {
    let [, arrayType, isArray] = `${type}`.match(/^(.+)(\[\])$/) || [];
    if (isArray) {
      return (
        <>
          <TypeContent type={arrayType} />
          {'[]'}
        </>
      );
    }

    const subTypes = type.split(/\s*\|\s*/);
    if (subTypes.length > 1) {
      const childTypes: React.ReactNode[] = [];
      subTypes.forEach((name, i) => {
        if (i > 0) {
          childTypes.push(
            <span key={`or_${i}`} className={classes.or}>
              {'|'}
            </span>,
          );
        }
        childTypes.push(<TypeContent key={`${name}_${i}`} type={name} maxInlineItems={maxInlineItems} />);
      });

      return <>{childTypes}</>;
    }

    return <TypeLink name={type} />;
  }

  if (type?.type === 'promise') {
    return (
      <>
        {'Promise<'}
        <TypeContent type={type.returns} maxInlineItems={maxInlineItems} />
        {'>'}
      </>
    );
  }

  if (type?.type === 'object') {
    return (
      <>
        {'{'}
        <Params params={type.params!} maxInlineItems={maxInlineItems} />
        {'}'}
      </>
    );
  }

  if (type?.type === 'function') {
    const params = type.params!;
    const inlineParams = params.length <= maxInlineItems;
    return (
      <div className={cx({ [classes.inline]: inlineParams })}>
        <Name>{type.name}</Name>
        {'('}
        <Params params={params} maxInlineItems={maxInlineItems} />
        {')'}
        {showReturnType && (
          <>
            {' => '}
            <TypeContent type={type.returns} maxInlineItems={maxInlineItems} showReturnType />
          </>
        )}
      </div>
    );
  }

  return <TypeLink name={type} />;
};

const TypeContent = Styled<TypeContentProps>(contentStyles)(TypeContentRenderer);

const styles = ({ fontFamily }: Rsg.Theme) => ({
  type: {
    fontFamily: fontFamily.monospace,
    whiteSpace: 'nowrap',
  },
});

interface TypeProps extends JssInjectedProps {
  className?: string;
  type?: string | Type;
  children?: React.ReactNode;
  maxInlineItems?: number;
  showReturnType: boolean;
}

export const TypeRenderer: React.FunctionComponent<TypeProps> = ({
  classes,
  className,
  type,
  children,
  maxInlineItems = 1,
  showReturnType = false,
}) => {
  return type || children ? (
    <span className={cx(className, classes.type)}>
      <TypeContent type={type || children} maxInlineItems={maxInlineItems} showReturnType={showReturnType} />
    </span>
  ) : null;
};

export default Styled<TypeProps>(styles)(TypeRenderer);
