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

const linkStyles = () => ({
  link: {
    borderBottom: '1px dashed !important',
  },
});

interface TypeLinkProps extends JssInjectedProps {
  name: string;
}

const TypeLinkRenderer: React.FunctionComponent<TypeLinkProps> = ({ classes, name }) => {
  if (availableTypes.indexOf(name) < 0) {
    return <>{name}</>;
  }

  return (
    <Link className={classes.link} href={`/#/SDK/Types/${name}`}>
      {name}
    </Link>
  );
};

const TypeLink = Styled<TypeProps>(linkStyles)(TypeLinkRenderer);

const paramsStyles = ({ space, color }: Rsg.Theme) => ({
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
    },
  },
  param: {
    display: 'flex',
    alignItems: 'center',
    padding: [[0, space[0]]],
  },
  label: {
    marginRight: space[1],
    color: color.codeComment,
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
      {params.map(({ name, type }, i) => (
        <div key={name} className={classes.param}>
          <span className={classes.label}>{`${name}: `}</span>
          <TypeContent type={type} maxInlineItems={maxInlineItems} />
          {(i < params.length - 1 || !inlineParams) && ','}
        </div>
      ))}
    </div>
  );
};

const Params = Styled<TypeProps>(paramsStyles)(ParamsRenderer);

const contentStyles = ({ space, color }: Rsg.Theme) => ({
  method: {
    padding: [[space[1], 0]],
  },
  inline: {
    display: 'flex',
    alignItems: 'center',
  },
  or: {
    padding: [[0, space[1]]],
    color: color.codeComment,
  },
});

interface TypeContentProps extends JssInjectedProps {
  type: string | Type;
  maxInlineItems: number;
}

const TypeContentRenderer: React.FunctionComponent<TypeContentProps> = ({ classes, type, maxInlineItems }) => {
  if (typeof type === 'string') {
    const [, isPromise, promiseContent] = `${type}`.match(/^(Promise<)(.+)>$/) || [];
    if (isPromise) {
      return (
        <>
          {'Promise<'}
          <TypeContent type={promiseContent} maxInlineItems={maxInlineItems} />
          {'>'}
        </>
      );
    }

    let [, arrayType, isArray] = `${type}`.match(/^(\w+)(\[\])$/) || [];
    if (isArray) {
      return (
        <>
          <TypeLink name={arrayType} />
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
            <span key={`or-${i}`} className={classes.or}>
              {'|'}
            </span>,
          );
        }
        childTypes.push(<TypeContent key={name} type={name} maxInlineItems={maxInlineItems} />);
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
      <div className={cx(classes.method, { [classes.inline]: inlineParams })}>
        <Name>{type.name}</Name>
        {'('}
        <Params params={params} maxInlineItems={maxInlineItems} />
        {')'}
      </div>
    );
  }

  return <TypeLink name={type} />;
};

const TypeContent = Styled<TypeContentProps>(contentStyles)(TypeContentRenderer);

const styles = ({ fontFamily, fontSize, color }: Rsg.Theme) => ({
  type: {
    fontFamily: fontFamily.monospace,
    fontSize: fontSize.small,
    color: color.type,
    whiteSpace: 'nowrap',
  },
});

interface TypeProps extends JssInjectedProps {
  className?: string;
  type?: string | Type;
  children?: React.ReactNode;
  maxInlineItems?: number;
}

export const TypeRenderer: React.FunctionComponent<TypeProps> = ({
  classes,
  className,
  type,
  children,
  maxInlineItems = 1,
}) => {
  return type || children ? (
    <span className={cx(className, classes.type)}>
      <TypeContent type={type || children} maxInlineItems={maxInlineItems} />
    </span>
  ) : null;
};

export default Styled<TypeProps>(styles)(TypeRenderer);
