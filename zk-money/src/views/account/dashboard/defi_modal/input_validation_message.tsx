import styled from 'styled-components/macro';
import { Text } from '../../../../components';
import { InputAnnotation } from './types';

const Root = styled.div`
  height: 30px;
`;

export function InputValidationAnnotation({ annotation }: { annotation?: InputAnnotation }) {
  return (
    <Root>
      <Text size="xxs" weight={annotation?.type === 'error' ? 'semibold' : 'normal'}>
        {annotation?.text}
      </Text>
    </Root>
  );
}
