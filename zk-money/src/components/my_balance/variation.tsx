import styled from 'styled-components/macro';
import ProfitIcon from '../../images/profit_icon.svg';
import LossIcon from '../../images/loss_icon.svg';
import { formatCurrency } from './helpers';

interface VariationProps {
  amount: number;
}

interface VariationWrapperProps {
  type: VariationType;
}

export enum VariationType {
  NO_VARIATION = 'white',
  PROFIT = '#1FE5CE',
  LOSS = '#E54E1F',
}

const VariationWrapper = styled.div<VariationWrapperProps>`
  display: flex;
  align-items: center;
  flex-direction: row;
  justify-content: center;
  color: ${({ type }) => type};
`;

const VariationIcon = styled.img`
  width: 20px;
  margin-right: 10px;
`;

const VariationText = styled.span`
  white-space: nowrap;
`;

export function Variation({ amount }: VariationProps) {
  if (amount > 0) {
    return (
      <VariationWrapper type={VariationType.PROFIT}>
        <VariationIcon src={ProfitIcon} />
        <VariationText>+ {formatCurrency(amount)}</VariationText>
      </VariationWrapper>
    );
  }

  if (amount < 0) {
    return (
      <VariationWrapper type={VariationType.LOSS}>
        <VariationIcon src={LossIcon} />
        <VariationText>- {formatCurrency(Math.abs(amount))}</VariationText>
      </VariationWrapper>
    );
  }

  return null;
}
