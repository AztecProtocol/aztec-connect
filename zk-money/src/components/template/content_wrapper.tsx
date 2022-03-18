import styled from 'styled-components/macro';
import { breakpoints, spacings } from '../../styles';

export const ContentWrapper = styled.div`
  position: relative;
  padding: 0 20px;
  width: 100%;
  max-width: 1000px;

  @media (max-width: ${breakpoints.m}) {
    padding: 0 ${spacings.l};
  }

  @media (max-width: ${breakpoints.s}) {
    padding: 0 ${spacings.m};
  }
`;
