import React from 'react';
import styled from 'styled-components';
import errorIcon from '../images/exclamation_mark.svg';
import { spacings, systemStates } from '../styles';
import { Dot } from './dot';
import { Loader } from './loader';
import { PaddedBlock } from './padded_block';
import { Text } from './text';

const FlexPaddedRow = styled(PaddedBlock)`
  display: flex;
  align-items: center;
`;

const FlexExpand = styled.div`
  flex: 1;
  padding-right: ${spacings.s};
`;

const FlexFixed = styled.div`
  flex-shrink: 0;
`;

interface ContentProps {
  inactive: boolean;
}

const Content = styled(Text)<ContentProps>`
  ${({ inactive }) => inactive && 'opacity: 0.5;'}
`;

const ProgressIconRoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
`;

const ErrorIconRoot = styled(ProgressIconRoot)`
  border-radius: 100%;
  background: ${systemStates.error};
`;

const ErrorIcon = styled.img`
  width: 8px;
`;

interface TxProgressProps {
  text: string;
  done: boolean;
  isLoading: boolean;
  failed: boolean;
  inactive: boolean;
}

export const TxProgress: React.FunctionComponent<TxProgressProps> = ({ text, isLoading, done, failed, inactive }) => (
  <FlexPaddedRow size="xs">
    <FlexExpand>
      <Content text={text} size="m" inactive={inactive} />
    </FlexExpand>
    <FlexFixed>
      {isLoading && (
        <ProgressIconRoot>
          <Loader />
        </ProgressIconRoot>
      )}
      {done && (
        <ProgressIconRoot>
          <Dot size="xs" color="green" />
        </ProgressIconRoot>
      )}
      {failed && (
        <ErrorIconRoot>
          <ErrorIcon src={errorIcon} />
        </ErrorIconRoot>
      )}
    </FlexFixed>
  </FlexPaddedRow>
);
