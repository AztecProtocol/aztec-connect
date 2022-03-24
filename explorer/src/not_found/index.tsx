import React from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Button, Text } from '../components';
import { spacings } from '../styles';
import { Section } from '../template';

const NotFoundRoot = styled.div`
  padding-bottom: ${spacings.xxl};
`;

const BackButtonRoot = styled.div`
  display: flex;
  padding: ${spacings.xl} 0;
`;

export const NotFound: React.FunctionComponent = () => {
  const urlQuery = new URLSearchParams(useLocation().search);
  const query = urlQuery.get('q');

  return (
    <NotFoundRoot>
      <Section title="Not Found">
        {!!query && (
          <Text size="m">
            {'Sorry! No results match the search term:'}
            <Text weight="semibold">{decodeURIComponent(query)}</Text>
          </Text>
        )}
        {!query && <Text size="m">{"Looks like you've followed a link that doesn't exist on this site."}</Text>}
        <BackButtonRoot>
          <Button text="Back to Block Explorer" to="/" />
        </BackButtonRoot>
      </Section>
    </NotFoundRoot>
  );
};
