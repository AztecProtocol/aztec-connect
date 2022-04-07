import type { DefiRecipe } from 'alt-model/defi/types';
import type { DefiPosition } from 'alt-model/defi/open_position_hooks';
import { renderInteractionField } from './defi_investment_interaction_fields';
import { renderValueField } from './defi_investment_value_fields';
import style from './defi_investment_row.module.scss';
import { renderApyField } from './defi_investment_apy_field';

interface DefiInvestmentRowProps {
  position: DefiPosition;
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function DefiInvestmentRow({ position, onOpenDefiExitModal }: DefiInvestmentRowProps) {
  const { recipe } = position;
  return (
    <div className={style.root}>
      <div className={style.segment}>
        <img className={style.logo} src={recipe.miniLogo} alt="" />
        <div className={style.name}>{recipe.name}</div>
      </div>
      <div className={style.separator} />
      <div className={style.segment}>
        <div className={style.apy}>{renderApyField(position)}</div>
      </div>
      <div className={style.segment}>
        <div className={style.value}>{renderValueField(position)}</div>
      </div>
      <div className={style.separator} />
      <div className={style.lastSegment}>{renderInteractionField(position, onOpenDefiExitModal)}</div>
    </div>
  );
}
