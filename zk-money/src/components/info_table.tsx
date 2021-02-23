import React from 'react';
import styled from 'styled-components';
import { spacings, Theme, themeColours } from '../styles';
import { InputTheme, InputWrapper } from './input';
import { Text } from './text';

const Root = styled(InputWrapper)`
  flex-direction: column;
`;

const itemClassname = 'item';

const ItemRoot = styled.div`
  display: flex;
  padding: ${spacings.s} ${spacings.m};
  width: 100%;

  & + .${itemClassname} {
    border-top: 1px solid ${themeColours[Theme.WHITE].border};
  }
`;

const Title = styled(Text)`
  flex: 1;
`;

const ContentRoot = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
`;

export interface InfoItem {
  title: string | React.ReactNode;
  content: string | React.ReactNode;
}

interface InfoTableProps {
  theme: InputTheme;
  items: InfoItem[];
}

export const InfoTable: React.FunctionComponent<InfoTableProps> = ({ theme, items }) => (
  <Root theme={theme}>
    {items.map(({ title, content }, i) => (
      <ItemRoot key={i} className={itemClassname}>
        <Title size="m">{title}</Title>
        <ContentRoot>
          <Text size="m">{content}</Text>
        </ContentRoot>
      </ItemRoot>
    ))}
  </Root>
);
