import React from 'react';
import styled from 'styled-components';
import { AccountAction, AccountState, Asset, MergeForm, sum } from '../../app';
import { BlockTitle, DisclaimerBlock, TextLink } from '../../components';
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

interface AccountAssetProps {
  asset: Asset;
  accountState: AccountState;
  mergeForm?: MergeForm;
  onSubmitMergeForm(toMerge: bigint[]): void;
  onSelectAction(action: AccountAction): void;
}

export const AccountAsset: React.FunctionComponent<AccountAssetProps> = ({
  asset,
  accountState,
  mergeForm,
  onSubmitMergeForm,
  onSelectAction,
}) => {
  const { balance, spendableBalance, accountTxs, joinSplitTxs, txsPublishTime } = accountState;
  const pendingTxs = joinSplitTxs.filter(tx => !tx.settled);

  return (
    <>
      {!balance && (
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
            pendingValue={sum(pendingTxs.map(tx => tx.balanceDiff))}
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
      {!!mergeForm && (
        <Row>
          <MergeBlock form={mergeForm} onSubmit={onSubmitMergeForm} />
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
