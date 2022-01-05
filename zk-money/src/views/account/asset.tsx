import React from 'react';
import styled from 'styled-components';
import { AccountAction, AccountState, Asset, AssetState, sum, WorldState } from '../../app';
import {
  BlockTitle,
  Button,
  DisclaimerBlock,
  ProgressHandler,
  Spinner,
  SpinnerTheme,
  Text,
  TextLink,
} from '../../components';
import { breakpoints, spacings } from '../../styles';
import { MergeBlock } from './merge_block';
import { ShieldPrompt } from './shield_prompt';
import { TransactionHistory } from './transaction_history';
import { ValueSummary } from './value_summary';

const Row = styled.div`
  padding: ${spacings.xl} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.m} 0;
  }
`;

const PaddedRow = styled(Row)`
  display: flex;
  align-items: flex-end;
  margin: 0 -${spacings.m};

  @media (max-width: ${breakpoints.l}) {
    margin: 0 -${spacings.s};
  }

  @media (max-width: ${breakpoints.m}) {
    margin: 0 -${spacings.s};
    flex-direction: column;
  }
`;

const Col = styled.div`
  padding: 0 ${spacings.m};
  width: 50%;

  @media (max-width: ${breakpoints.l}) {
    padding: 0 ${spacings.s};
  }

  @media (max-width: ${breakpoints.m}) {
    padding: ${spacings.xs} ${spacings.s};
    width: 100%;
  }
`;

const InitializationRoot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${spacings.xxl} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.l} 0;
  }
`;

const InitializationMessage = styled(Text)`
  padding: ${spacings.s} 0;
`;

interface AccountAssetProps {
  worldState: WorldState;
  accountState: AccountState;
  asset: Asset;
  assetState: AssetState;
  mergeForm?: {
    mergeOption: bigint[];
    fee: bigint;
  };
  txsPublishTime?: Date;
  onSubmitMergeForm(toMerge: bigint[]): void;
  onSelectAction(action: AccountAction): void;
  onExplainUnsettled(): void;
  isInitializing: boolean;
}

export const AccountAsset: React.FunctionComponent<AccountAssetProps> = ({
  worldState,
  accountState,
  asset,
  assetState,
  mergeForm,
  txsPublishTime,
  onSubmitMergeForm,
  onSelectAction,
  onExplainUnsettled,
  isInitializing,
}) => {
  if (isInitializing) {
    const showProgress = worldState.latestRollup - worldState.accountSyncedToRollup > 10;
    return (
      <InitializationRoot>
        <Spinner theme={SpinnerTheme.GRADIENT} size="m" />
        <InitializationMessage size="s">
          {showProgress ? 'Syncing Account Data ' : 'Getting things ready'}
          {showProgress && (
            <ProgressHandler worldState={worldState}>{(progress: number) => <>{`(${progress}%)`}</>}</ProgressHandler>
          )}
        </InitializationMessage>
      </InitializationRoot>
    );
  }

  const isLoading = asset.id !== assetState.asset.id;
  const { accountTxs, settled } = accountState;
  const { balance, spendableBalance, joinSplitTxs, pendingBalance } = assetState;
  const pendingTxs = joinSplitTxs.filter(tx => !tx.settled);
  const pendingValue = sum(pendingTxs.map(tx => tx.balanceDiff));

  return (
    <>
      {!isLoading && (
        <Row>
          <ShieldPrompt
            asset={asset}
            balance={balance}
            pendingValue={pendingValue}
            pendingBalance={pendingBalance}
            onSubmit={() => onSelectAction(AccountAction.SHIELD)}
          />
        </Row>
      )}
      <PaddedRow>
        <Col>
          <BlockTitle title="Shielded Balance" />
          <ValueSummary
            title="Total"
            value={balance}
            price={assetState.price}
            pendingValue={pendingValue}
            pendingTxs={pendingTxs.length}
            asset={asset}
            isLoading={isLoading}
          />
        </Col>
        <Col>
          <BlockTitle
            info={
              spendableBalance < balance ? (
                <TextLink
                  text={settled ? 'Why can’t I send my full balance?' : 'Why can’t I send my balance?'}
                  onClick={settled ? () => onSelectAction(AccountAction.MERGE) : onExplainUnsettled}
                  size="xs"
                  italic
                />
              ) : null
            }
          />
          <ValueSummary
            title="Sendable Balance"
            value={spendableBalance}
            asset={asset}
            buttonSlot={
              <Button theme="white" text="Send" onClick={() => onSelectAction(AccountAction.SEND)} size="l" outlined />
            }
            isLoading={isLoading}
          />
        </Col>
      </PaddedRow>
      {settled && !!mergeForm && (
        <Row>
          <MergeBlock
            assetState={assetState}
            mergeOption={mergeForm.mergeOption}
            fee={mergeForm.fee}
            onSubmit={onSubmitMergeForm}
          />
        </Row>
      )}
      <Row>
        <DisclaimerBlock assetState={assetState} />
      </Row>
      <Row>
        <BlockTitle title="Transaction History" />
        <TransactionHistory
          asset={asset}
          accountTxs={accountTxs}
          joinSplitTxs={joinSplitTxs}
          txsPublishTime={txsPublishTime}
        />
      </Row>
    </>
  );
};
