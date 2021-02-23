import styled from 'styled-components';
import { breakpoints, spacings } from '../../styles';

export const ContentWrapper = styled.div`
  position: relative;
  padding: 0 ${spacings.xl};
  width: 100%;
  max-width: ${parseInt(breakpoints.xl) - parseInt(spacings.xl) * 2}px;

  @media (max-width: ${breakpoints.m}) {
    padding: 0 ${spacings.l};
  }

  @media (max-width: ${breakpoints.s}) {
    padding: 0 ${spacings.m};
  }
`;
