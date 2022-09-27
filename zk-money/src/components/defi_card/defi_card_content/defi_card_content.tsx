import { useState } from 'react';
import { InfoWrap, Button } from 'ui-components';
import { DefiRecipe } from 'alt-model/defi/types';
import { DefiCardDescription } from './defi_card_description';
import { DefiCardInfoContent } from './defi_card_info_content';
import { DefiCardProgress } from './defi_card_progress';
import { DefiCardStats } from './defi_card_stats';
import style from './defi_card_content.module.scss';

interface DefiCardContentProps {
  onSelect: (recipe: DefiRecipe) => void;
  recipe: DefiRecipe;
  isLoggedIn: boolean;
}

export const DefiCardContent = (props: DefiCardContentProps) => {
  const [isInformationOpen, setIsInformationOpen] = useState(false);

  const handleCloseInformation = () => {
    setIsInformationOpen(false);
  };

  const handleClickDeposit = () => {
    if (props.isLoggedIn) {
      props.onSelect(props.recipe);
    }
  };

  return (
    <InfoWrap
      showingInfo={isInformationOpen}
      onHideInfo={handleCloseInformation}
      infoHeader="DeFi Investing"
      infoContent={<DefiCardInfoContent />}
      borderRadius={20}
    >
      <div className={style.defiCardContentWrapper}>
        <DefiCardDescription text={props.recipe.shortDesc} />
        <DefiCardStats recipe={props.recipe} />
        <DefiCardProgress recipe={props.recipe} />
        <Button
          className={style.defiCardButton}
          gradient={props.recipe.gradient && { from: props.recipe.gradient[0], to: props.recipe.gradient[1] }}
          text={props.recipe.cardButtonLabel}
          disabled={!props.isLoggedIn}
          onClick={handleClickDeposit}
        />
      </div>
    </InfoWrap>
  );
};
