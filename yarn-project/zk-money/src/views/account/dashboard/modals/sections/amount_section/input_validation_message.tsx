import { default as styled } from 'styled-components';
import { Text } from '../../../../../../components/index.js';
import { InputAnnotation } from './types.js';

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
