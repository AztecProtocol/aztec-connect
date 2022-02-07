import { useState } from 'react';
import styled from 'styled-components/macro';
import { Button } from '../..';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { DeFiCardDescription } from './defi_card_description';
import { DeFiCardInformation } from './defi_card_information';
import { DeFiCardProgress } from './defi_card_progress';
import { DeFiCardStats } from './defi_card_stats';

const DeFiCardButton = styled(Button)`
  margin: 20px 0 25px 0;
  width: 185px;
`;

interface DeFiCardContentProps {
  onSelect: (recipe: DefiRecipe) => void;
  recipe: DefiRecipe;
}

export const DeFiCardContent = (props: DeFiCardContentProps) => {
  const [isInformationOpen, setIsInformationOpen] = useState(false);

  const handleOpenInformation = () => {
    setIsInformationOpen(true);
  };

  const handleCloseInformation = () => {
    setIsInformationOpen(false);
  };

  const handleClickDeposit = () => {
    props.onSelect(props.recipe);
  };

  return (
    <>
      <DeFiCardDescription onOpenInformation={handleOpenInformation} text={props.recipe.shortDesc} />
      <DeFiCardStats />
      <DeFiCardProgress />
      <DeFiCardButton theme="gradient" text="Deposit zkETH" onClick={handleClickDeposit} />
      {isInformationOpen && <DeFiCardInformation onCloseInformation={handleCloseInformation} />}
    </>
  );
};
