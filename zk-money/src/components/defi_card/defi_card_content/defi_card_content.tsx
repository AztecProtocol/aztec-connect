import { useState } from 'react';
import { bindStyle } from 'ui-components/util/classnames';
import { InfoWrap } from 'ui-components';
import { Button } from '../..';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiCardDescription } from './defi_card_description';
import { DefiCardInfoContent } from './defi_card_info_content';
import { DefiCardProgress } from './defi_card_progress';
import { DefiCardStats } from './defi_card_stats';
import style from './defi_card_content.module.scss';

const cx = bindStyle(style);

interface DefiCardContentProps {
  onSelect: (recipe: DefiRecipe) => void;
  recipe: DefiRecipe;
  isLoggedIn: boolean;
}

export const DefiCardContent = (props: DefiCardContentProps) => {
  const [isInformationOpen, setIsInformationOpen] = useState(false);

  const handleOpenInformation = () => {
    setIsInformationOpen(true);
  };

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
          className={cx(style.defiCardButton, !props.isLoggedIn && style.disabledButton)}
          theme="gradient"
          text={`Deposit zk${props.recipe.flow.enter.inA.symbol}`}
          onClick={handleClickDeposit}
        />
      </div>
    </InfoWrap>
  );
};
