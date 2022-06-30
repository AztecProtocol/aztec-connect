import type { DefiRecipe } from 'alt-model/defi/types';
import type { DefiPosition } from 'alt-model/defi/open_position_hooks';
import { bindStyle } from 'ui-components/util/classnames';
import { renderInteractionField } from './defi_investment_interaction_fields';
import { renderValueField } from './defi_investment_value_fields';
import { renderApyField } from './defi_investment_apy_field';
import style from './defi_investment_row.module.scss';

const cx = bindStyle(style);

interface DefiInvestmentRowProps {
  position: DefiPosition;
  onOpenDefiExitModal: (recipe: DefiRecipe) => void;
}

export function DefiInvestmentRow({ position, onOpenDefiExitModal }: DefiInvestmentRowProps) {
  const { recipe } = position;
  return (
    <div className={style.root}>
      <div className={cx(style.segment, style.nameWrapper)}>
        <img className={style.logo} src={recipe.miniLogo} alt="" />
        <div className={style.name}>{recipe.name}</div>
      </div>
      <div className={style.separator} />
      <div className={cx(style.segment, style.apyWrapper)}>
        <div className={style.apy}>{renderApyField(position)}</div>
      </div>
      <div className={cx(style.segment, style.valueWrapper)}>
        <div className={style.value}>{renderValueField(position)}</div>
      </div>
      <div className={style.separator} />
      <div className={style.lastSegment}>{renderInteractionField(position, onOpenDefiExitModal)}</div>
    </div>
  );
}
