import { useState } from 'react';
import styled from 'styled-components/macro';
import { Button } from '../..';
import { DefiRecipe } from '../../../alt-model/defi/types';
import { DefiCardDescription } from './defi_card_description';
import { DefiCardInformation } from './defi_card_information';
import { DefiCardProgress } from './defi_card_progress';
import { DefiCardStats } from './defi_card_stats';

const DefiCardButton = styled(Button)`
  margin: 20px 0 25px 0;
  width: 185px;
`;

interface DefiCardContentProps {
  onSelect: (recipe: DefiRecipe) => void;
  recipe: DefiRecipe;
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
    props.onSelect(props.recipe);
  };

  return (
    <>
      <DefiCardDescription onOpenInformation={handleOpenInformation} text={props.recipe.shortDesc} />
      <DefiCardStats />
      <DefiCardProgress />
      <DefiCardButton theme="gradient" text="Deposit zkETH" onClick={handleClickDeposit} />
      {isInformationOpen && <DefiCardInformation onCloseInformation={handleCloseInformation} />}
    </>
  );
};
