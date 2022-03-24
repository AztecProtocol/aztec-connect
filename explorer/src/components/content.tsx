import React from 'react';
import styled, { css } from 'styled-components';
import { spacings, borderRadius, Spacing } from '../styles';

interface ContentRowProps {
  valign?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  size?: Spacing;
}

export const ContentRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: ${({ valign }: ContentRowProps) => valign || ''};
  margin: -${({ size }: ContentRowProps) => spacings[size || 'l']};
`;

export const contentStyle = css`
  background: rgba(40, 45, 50, 0.8);
  border-radius: ${borderRadius};
`;

export const contentHighlightStyle = css`
  background: rgba(40, 45, 50, 1);
  border-radius: ${borderRadius};
`;

export const contentPlaceholderStyle = css`
  background: rgba(182, 182, 182, 0.1);
  border-radius: ${borderRadius};
  opacity: 0.5;
`;

interface ContentProps {
  size?: Spacing;
}

export const Content = styled.div`
  ${contentStyle}
  padding: ${({ size }: ContentProps) => spacings[size || 'l']};
`;

interface ContentColRootProps {
  column: number;
  size: Spacing;
}

const ContentColRoot = styled.div`
  padding: ${({ size }: ContentColRootProps) => spacings[size]};
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
}

export const ContentCol: React.FunctionComponent<ContentColProps> = ({ className, column, children, size = 'l' }) => (
  <ContentColRoot className={className} column={column} size={size}>
    <ContentColInner>{children}</ContentColInner>
  </ContentColRoot>
);
