import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Row, Col, Block, Text, TextButton } from '@aztec/guacamole-ui';
import { ThemeContext } from '../config/context';

const ContentText = styled(Text)`
  overflow-wrap: anywhere;
`;

interface ContentLinkProps {
  text: string;
  href: string;
}

export const ContentLink = ({ text, href }: ContentLinkProps) => (
  <ThemeContext.Consumer>
    {({ theme, link }) => (
      <TextButton
        theme={theme === 'dark' ? 'underline' : 'implicit'}
        text={text}
        href={href}
        color={link}
        Link={Link}
      />
    )}
  </ThemeContext.Consumer>
);

interface DetailRowProps {
  title: string;
  content: React.ReactNode;
}

export const DetailRow = ({ title, content }: DetailRowProps) => (
  <Block padding="s 0">
    <ThemeContext.Consumer>
      {({ colorLight }) => (
        <Row>
          <Col column={3}>
            <Text text={title} size="xs" color={colorLight} />
          </Col>
          <Col column={9}>
            <ContentText text={content} size="xs" />
          </Col>
        </Row>
      )}
    </ThemeContext.Consumer>
  </Block>
);
