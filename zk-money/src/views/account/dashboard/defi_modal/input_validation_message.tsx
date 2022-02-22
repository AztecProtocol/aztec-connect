import styled from 'styled-components/macro';
import { Text } from '../../../../components';
import { InputAnnotation } from './types';

const Root = styled.div`
  height: 30px;
  margin-top: 5px;
  text-align: right;
`;

export function InputValidationAnnotation({ annotation }: { annotation?: InputAnnotation }) {
  return (
    <Root>
      <Text size="xs" weight={annotation?.type === 'error' ? 'semibold' : 'normal'}>
        {annotation?.text}
      </Text>
    </Root>
  );
}
