import { DefiRecipe } from '../../../alt-model/defi/types';
import { CardAssetTag, CardInvestmentTypeTag } from '../..';
import style from './defi_card_header.module.scss';

export const DefiCardHeader = ({ recipe }: { recipe: DefiRecipe }) => {
  const { investmentType, logo, flow } = recipe;
  return (
    <div className={style.cardHeader}>
      <img className={style.cardHeaderLogo} src={logo} />
      <div className={style.cardHeaderButtonsWrapper}>
        <CardInvestmentTypeTag investmentType={investmentType} />
        <CardAssetTag asset={flow.enter.inA} />
      </div>
    </div>
  );
};
