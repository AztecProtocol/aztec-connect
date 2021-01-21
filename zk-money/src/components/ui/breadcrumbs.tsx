import React from 'react';
import styled from 'styled-components';
import { FontSize, spacings } from '../../styles';
import { Text } from './text';
import { TextLink } from './text_link';

const Root = styled.div`
  display: flex;
  align-items: center;
  margin: -${spacings.xs};
`;

const BreadcrumbRoot = styled.div`
  display: flex;
  align-items: center;
`;

const Item = styled.div`
  padding: ${spacings.xs};
  white-space: nowrap;
`;

export interface Breadcrumb {
  text: string;
  to?: string;
  highlight?: boolean;
}

export interface BreadcrumbsProps {
  className?: string;
  size?: FontSize;
  breadcrumbs: Breadcrumb[];
}

export const Breadcrumbs: React.FunctionComponent<BreadcrumbsProps> = ({ className, size = 'l', breadcrumbs }) => (
  <Root className={className}>
    {breadcrumbs.map(({ text, to, highlight }, i) => (
      <BreadcrumbRoot key={i}>
        {i > 0 && (
          <Item>
            <Text text=">" size={size} weight="light" />
          </Item>
        )}
        <Item>
          {!to && <Text text={text} size={size} weight={highlight ? 'semibold' : 'light'} />}
          {to && <TextLink text={text} to={to} size={size} weight={highlight ? 'semibold' : 'light'} />}
        </Item>
      </BreadcrumbRoot>
    ))}
  </Root>
);
