import styled from 'styled-components/macro';
import openIcon from '../../../images/open.svg';
import loadingIcon from '../../../images/defi_loader.svg';
import { gradients } from '../../../styles';
import { Button } from '../..';
import { DefiPosition } from 'alt-model/defi/open_position_hooks';
import { useAssetInfo } from 'alt-model/asset_hooks';
import { formatBaseUnits } from 'app';
import { BridgeDataAdaptor } from 'alt-model/defi/bridge_data_adaptors/types';
import { DefiInvestmentType, DefiRecipe } from 'alt-model/defi/types';
import { useBridgeDataAdaptor, useExpectedOutput, useExpectedYield } from 'alt-model/defi/defi_info_hooks';
import { BridgeId } from '@aztec/sdk';

const S = {
  InvestmentWrapper: styled.div`
    display: flex;
    flex-direction: row;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    padding: 10px;
    margin: 5px 0;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    height: 60px;
    overflow: hidden;
  `,

  Name: styled.div`
    display: flex;
    letter-spacing: 0.02em;
    padding: 0 25px 0 5px;
    flex-shrink: 1;
  `,

  Values: styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    border: 1px solid #eeeeee;
    border-width: 0 1px 0 1px;
    padding: 0 25px;
    font-size: 16px;
    justify-content: space-between;
    letter-spacing: 0.1em;
    flex-grow: 1;
    flex-shrink: 1;
  `,

  Actions: styled.div`
    font-size: 16px;
    flex-shrink: 0;
    padding: 0 5px 0 25px;
    width: 150px;
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    /* the width is to make the button appear with no shrinking */
    width: 192px;
    justify-content: space-between;
  `,

  NameLabel: styled.div`
    display: flex;
    align-items: center;
  `,

  APYRate: styled.div`
    font-style: italic;
    background-color: ${gradients.primary.from};
    background-image: linear-gradient(134.14deg, ${gradients.primary.from} 18.37%, ${gradients.primary.to} 82.04%);
    background-size: 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -moz-background-clip: text;
    -webkit-text-fill-color: transparent;
    -moz-text-fill-color: transparent;
  `,

  Amount: styled.div`
    display: flex;
    align-items: center;
  `,

  DefiLogo: styled.img<{ isLoading: boolean }>`
    width: 30px;
    margin-right: 20px;
    opacity: ${({ isLoading }) => (isLoading ? 0.5 : 1)};
  `,

  ETA: styled.div`
    color: #b7bccd;
    font-style: italic;
    flex-shrink: 1;
  `,

  OpenButton: styled.img`
    width: 20px;
  `,

  LoadingIcon: styled.img`
    width: 20px;
    margin: 0 10px;
  `,
};

const percentageFormatter = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function ApyInfo({ recipe }: { recipe: DefiRecipe }) {
  const expectedYield = useExpectedYield(recipe);
  const yieldStr = expectedYield !== undefined ? percentageFormatter.format(expectedYield) : '??';
  if (recipe.investmentType === DefiInvestmentType.FIXED_YIELD) {
    return <S.APYRate>Fixed: {yieldStr} APY</S.APYRate>;
  }
  return <S.APYRate>Variable: {yieldStr} APY</S.APYRate>;
}

interface DefiInvestmentProps {
  position: DefiPosition;
}

function AmountInfo({
  bridgeId,
  dataAdaptor,
  inputValue,
}: {
  bridgeId: BridgeId;
  dataAdaptor: BridgeDataAdaptor;
  inputValue: bigint;
}) {
  const output = useExpectedOutput(dataAdaptor, bridgeId, inputValue);
  const asset = useAssetInfo(bridgeId.outputAssetIdA);
  const valueStr =
    asset === 'loading' || output === undefined
      ? '⌛'
      : asset === 'not-found'
      ? '??'
      : `${formatBaseUnits(output.value, asset.decimals)} zk${asset.symbol}`;
  return <S.Amount>{valueStr}</S.Amount>;
}

export function DefiInvestment({ position }: DefiInvestmentProps) {
  const { recipe, assetValue } = position;
  const { bridgeFlow } = recipe;
  const dataAdaptor = useBridgeDataAdaptor(recipe.id);

  const eta = undefined;
  const isLocked = true;

  let actions;
  if (eta) {
    actions = (
      <>
        <S.OpenButton src={openIcon} />
        <S.LoadingIcon src={loadingIcon} />
        <S.ETA>~{eta} mins</S.ETA>
      </>
    );
  } else if (isLocked) {
    actions = (
      <>
        <S.ETA>Fixed Term ~90 days</S.ETA>
      </>
    );
  } else {
    actions = (
      <>
        <Button text={`Claim & Exit`} />
      </>
    );
  }

  return (
    <S.InvestmentWrapper>
      <S.Name>
        <S.DefiLogo isLoading={!!eta} src={recipe.miniLogo} />
        <S.NameLabel>{recipe.name}</S.NameLabel>
      </S.Name>
      <S.Values>
        {dataAdaptor?.isYield && <ApyInfo recipe={recipe} />}
        {dataAdaptor?.isAsync === false && bridgeFlow.type === 'closable' && (
          <AmountInfo bridgeId={bridgeFlow.exit} dataAdaptor={dataAdaptor} inputValue={assetValue.value} />
        )}
      </S.Values>
      <S.Actions>{actions}</S.Actions>
    </S.InvestmentWrapper>
  );
}
