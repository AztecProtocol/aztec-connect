import { CardTag } from './card_tag';
import { DefiInvestmentType } from '../../alt-model/defi/types';

function getLabel(type: DefiInvestmentType) {
  switch (type) {
    case DefiInvestmentType.STAKING:
      return 'STAKING';
    case DefiInvestmentType.BORROW:
      return 'BORROW';
    case DefiInvestmentType.FIXED_YIELD:
      return 'FIXED YIELD';
    case DefiInvestmentType.YIELD:
      return 'YIELD';
  }
}

export function CardInvestmentTypeTag(props: { investmentType: DefiInvestmentType }) {
  return <CardTag motif="white">{getLabel(props.investmentType)}</CardTag>;
}
