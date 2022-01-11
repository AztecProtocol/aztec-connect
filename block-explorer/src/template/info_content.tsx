import React from 'react';
import styled from 'styled-components';
import { Content, Stat, DeviceWidth, StatTheme } from '../components';
import { breakpoints, sizeLte, spacings } from '../styles';

const Root = styled(Content)`
  position: relative;
  padding: ${spacings.m} ${spacings.l};
  height: 100%;

  @media (max-width: ${breakpoints.m}) {
    padding: ${spacings.s};
  }

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.s} ${spacings.xs};
  }
`;

const Row = styled.div`
  padding: ${spacings.s};

  @media (max-width: ${breakpoints.xs}) {
    padding: ${spacings.s} ${spacings.xs};
  }
`;

const TitleRoot = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

interface InfoContentProps {
  className?: string;
  theme: StatTheme;
  title: string;
  subtitle?: string;
  caption: string;
  titleContent?: React.ReactNode;
  titleIcon: string;
  children: React.ReactNode;
}

export const InfoContent: React.FunctionComponent<InfoContentProps> = ({
  className,
  theme,
  title,
  subtitle,
  caption,
  titleContent,
  titleIcon,
  children,
}) => (
  <Root className={className}>
    <Row>
      <TitleRoot>
        <DeviceWidth>
          {({ breakpoint }) => (
            <Stat
              theme={theme}
              icon={titleIcon}
              label={caption}
              subtitle={subtitle}
              value={title}
              size={sizeLte(breakpoint, 'xs') ? 'm' : 'l'}
            />
          )}
        </DeviceWidth>
        {titleContent}
      </TitleRoot>
    </Row>
    <Row>{children}</Row>
  </Root>
);
