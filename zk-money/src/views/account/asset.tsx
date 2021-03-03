import React from 'react';
import styled from 'styled-components';
import { AccountAction, AccountState, Asset, AssetState, sum } from '../../app';
import { BlockTitle, DisclaimerBlock, Spinner, Text, TextLink } from '../../components';
import { breakpoints, spacings } from '../../styles';
import { MergeBlock } from './merge_block';
import { TransactionHistory } from './transaction_history';
import { ValueSummary } from './value_summary';
import { ZeroBalancePrompt } from './zero_balance_prompt';

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
  isInitializing: boolean;
}

export const AccountAsset: React.FunctionComponent<AccountAssetProps> = ({
  accountState,
  asset,
  assetState,
  mergeForm,
  txsPublishTime,
  onSubmitMergeForm,
  onSelectAction,
  isInitializing,
}) => {
  if (isInitializing) {
    return (
      <InitializationRoot>
        <Spinner theme="gradient" size="m" />
        <InitializationMessage text="Getting things ready" size="s" />
      </InitializationRoot>
    );
  }

  const isLoading = asset.id !== assetState.asset.id;
  const { accountTxs } = accountState;
  const { balance, spendableBalance, joinSplitTxs } = assetState;
  const pendingTxs = joinSplitTxs.filter(tx => !tx.settled);
  const pendingValue = sum(pendingTxs.map(tx => tx.balanceDiff));

  return (
    <>
      {!isLoading && !balance && !pendingValue && (
        <Row>
          <ZeroBalancePrompt asset={asset} onSubmit={() => onSelectAction(AccountAction.SHIELD)} />
        </Row>
      )}
      <PaddedRow>
        <Col>
          <BlockTitle title="Shielded Balance" />
          <ValueSummary
            title="Total"
            value={balance}
            pendingValue={pendingValue}
            pendingTxs={pendingTxs.length}
            asset={asset}
            buttonText="Shield"
            onClick={() => onSelectAction(AccountAction.SHIELD)}
          />
        </Col>
        <Col>
          <BlockTitle
            info={
              spendableBalance < balance ? (
                <TextLink
                  text="Why can’t I send my full balance?"
                  onClick={() => onSelectAction(AccountAction.MERGE)}
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
            buttonText="Send"
            onClick={() => onSelectAction(AccountAction.SEND)}
          />
        </Col>
      </PaddedRow>
      {mergeForm && (
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
        <DisclaimerBlock />
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
