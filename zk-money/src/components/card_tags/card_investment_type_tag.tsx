import { CardTag } from './card_tag';
import { DefiInvestmentType } from '../../alt-model/defi/types';

function getLabel(type: DefiInvestmentType) {
  switch (type) {
    case DefiInvestmentType.STAKING:
      return 'Staking';
    case DefiInvestmentType.BORROW:
      return 'Borrow';
    case DefiInvestmentType.FIXED_YIELD:
      return 'Fixed Yield';
    case DefiInvestmentType.YIELD:
      return 'Yield';
  }
}

export function CardInvestmentTypeTag(props: { investmentType: DefiInvestmentType }) {
  return <CardTag>{getLabel(props.investmentType)}</CardTag>;
}
