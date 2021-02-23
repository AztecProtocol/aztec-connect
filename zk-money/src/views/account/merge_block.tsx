import React from 'react';
import styled from 'styled-components';
import { MergeForm, toBaseUnits } from '../../app';
import { Text } from '../../components';
import mergeIcon from '../../images/merge_gradient.svg';
import { borderRadiuses, breakpoints, colours, spacings } from '../../styles';
import { MergeTx } from './merge_tx';

const Root = styled.div`
  border-radius: ${borderRadiuses.m};
  box-shadow: 0px 1px 9px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const Content = styled.div`
  padding: ${spacings.s} ${spacings.l};

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.s} ${spacings.m};
  }
`;

const Block = styled.div`
  padding: ${spacings.s} 0;

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.s} 0;
  }
`;

const TitleRoot = styled(Block)`
  display: flex;
  align-items: center;
`;

const MergeIconRoot = styled.div`
  padding-right: ${spacings.m};
  line-height: 0;

  @media (max-width: ${breakpoints.s}) {
    padding-right: ${spacings.s};
  }
`;

const MergeIcon = styled.img`
  height: 36px;

  @media (max-width: ${breakpoints.s}) {
    height: 32px;
  }
`;

const MergeTxRow = styled(MergeTx)`
  padding: ${spacings.xs} ${spacings.l};
  background: ${colours.greyLight};

  @media (max-width: ${breakpoints.s}) {
    padding: ${spacings.xs} ${spacings.m};
  }
`;

interface MergeBlockProps {
  form: MergeForm;
  onSubmit(toMerge: bigint[]): void;
}

export const MergeBlock: React.FunctionComponent<MergeBlockProps> = ({ form, onSubmit }) => {
  const { asset, spendableBalance, mergeOptions, fee } = form;
  const [notes] = mergeOptions.value;

  return (
    <Root>
      <Content>
        <TitleRoot>
          <MergeIconRoot>
            <MergeIcon src={mergeIcon} />
          </MergeIconRoot>
          <Text text="Manage Balance" color="gradient" size="l" nowrap />
        </TitleRoot>
        <Block>
          <Text
            text="You have lots of loose change! Increase your sendable balance with the following “join” transaction."
            size="s"
          />
        </Block>
      </Content>
      <MergeTxRow
        asset={asset.value}
        prevAmount={spendableBalance.value}
        amount={notes.reduce((sum, v) => sum + v, 0n) - toBaseUnits(fee.value, asset.value.decimals)}
        fee={fee.value}
        onSubmit={() => onSubmit(notes)}
      />
    </Root>
  );
};
