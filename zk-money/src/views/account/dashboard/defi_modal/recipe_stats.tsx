import styled from 'styled-components/macro';
import { Text } from '../../../../components';
import { spacings } from '../../../../styles';

const Root = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: ${spacings.l} ${spacings.m};
`;

const ItemRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Label = styled(Text)`
  text-transform: uppercase;
  padding-bottom: ${spacings.s};
`;

function Item(props: { label: string; value: string }) {
  return (
    <ItemRoot>
      <Label text={props.label} size="xxs" />
      <Text text={props.value} weight="bold" italic />
    </ItemRoot>
  );
}

export function RecipeStats() {
  return (
    <Root>
      <Item label="Current yield" value="4.56%" />
      <Item label="L1 liquidity" value="$10Bn" />
      <Item label="Batch size" value="$150k" />
    </Root>
  );
}
