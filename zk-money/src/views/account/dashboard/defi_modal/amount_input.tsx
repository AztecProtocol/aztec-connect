import React from 'react';
import styled from 'styled-components/macro';
import { GradientBorder } from 'ui-components';
import { Asset } from '../../../../app';
import { Input, ShieldedAssetIcon } from '../../../../components';
import { spacings } from '../../../../styles';

// const Root = styled.div`
//   height: 54px;
//   width: 100%;
// `;

const Content = styled.div`
  display: flex;
  padding-left: ${spacings.s};
  align-items: center;
  justify-content: space-between;
`;

interface AmountInputProps extends React.ComponentProps<typeof Input> {
  asset: Asset;
}

export function AmountInput({ asset, onChangeValue, ...inputProps }: AmountInputProps) {
  const handleChangeValue = (value: string) => onChangeValue?.(value.replace(/[^0-9.]/g, ''));
  return (
    // <Root>
    <GradientBorder>
      <Content>
        <ShieldedAssetIcon asset={asset} />
        <Input {...inputProps} onChangeValue={handleChangeValue} />
      </Content>
    </GradientBorder>
    // </Root>
  );
}
