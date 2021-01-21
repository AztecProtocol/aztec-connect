import React from 'react';
import styled, { css } from 'styled-components';
import { spacings, Spacing } from '../../styles';

interface ContentRowProps {
  valign?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  size?: Spacing;
  padding?: Spacing;
}

export const ContentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: ${({ valign }: ContentRowProps) => valign || ''};
  margin: -${({ padding }: ContentRowProps) => spacings[padding || 'l']};
`;

export const contentStyle = css``;

export const contentHighlightStyle = css``;

export const contentPlaceholderStyle = css``;

interface ContentProps {
  size?: Spacing;
  padding?: Spacing;
}

export const Content = styled.div`
  ${contentStyle}
  padding: ${({ padding }: ContentProps) => spacings[padding || 'l']};
`;

interface ContentColRootProps {
  column: number;
  size: Spacing;
  padding?: Spacing;
}

const ContentColRoot = styled.div`
  padding: ${({ padding }: ContentColRootProps) => spacings[padding || 'l']};
  width: ${({ column }: ContentColRootProps) => column}%;
`;

const ContentColInner = styled.div`
  height: 100%;
`;

interface ContentColProps {
  className?: string;
  column: number;
  children: React.ReactNode;
  size?: Spacing;
  padding?: Spacing;
}

export const ContentCol: React.FunctionComponent<ContentColProps> = ({
  className,
  column,
  children,
  size = 'l',
  padding,
}) => (
  <ContentColRoot className={className} column={column} size={size} padding={padding}>
    <ContentColInner>{children}</ContentColInner>
  </ContentColRoot>
);
