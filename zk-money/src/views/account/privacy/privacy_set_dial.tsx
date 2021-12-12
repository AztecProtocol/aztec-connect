import React from 'react';
import styled from 'styled-components';
import { fromBaseUnits } from '../../../app';
import { Text } from '../../../components';
import { borderRadiuses, spacings, themeColours } from '../../../styles';
import { Asset } from '../../../app/assets';
import { depositorBucketGroups } from './privacy_util';
import usersIcon from '../../../images/users_icon.svg';
import triangleRight from '../../../images/triangle_right.svg';

const rowHeight = 35;

const Root = styled.div`
  width: 180px;
  display: grid;
  grid-template-rows: auto ${rowHeight * 5}px;
  grid-template-columns: 0 1fr;
  grid-template-areas:
    'empty header'
    'triangle body';
  color: ${themeColours.GRADIENT.text};
`;

const Header = styled.div`
  grid-area: header;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
  gap: ${spacings.s};
`;

const HeaderIcon = styled.div<{ url: string }>`
  height: 24px;
  width: 24px;
  background: url(${({ url }) => url});
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
`;

const Body = styled.div`
  grid-area: body;
  position: relative;
  overflow: hidden;
  mask-image: linear-gradient(transparent, rgba(0, 0, 0, 1), transparent);
`;

const Rows = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  transition: transform 0.4s;
`;

const Row = styled.div`
  width: 100%;
  height: ${rowHeight}px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  justify-items: center;
`;

const Highlight = styled.div`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: ${rowHeight * 1.2}px;
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: ${borderRadiuses.s};
  border: solid rgba(255, 255, 255, 0.8) 1px;
  display: flex;
  align-items: center;
`;

const HighlightCursor = styled.div`
  grid-area: triangle;
  transform: translateX(-200%);
  align-self: center;
  width: 14px;
  height: 14px;
  background: url(${triangleRight});
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
`;

const displaceForIdx = (idx: number) => -idx * rowHeight;

const emptyRow = (
  <Row>
    <Text text="-" />
    <Text text="-" />
  </Row>
);

const numberFormatter = new Intl.NumberFormat('en-GB');

interface PrivacySetDialProps {
  amount: bigint;
  asset: Asset;
}

export const PrivacySetDial: React.FunctionComponent<PrivacySetDialProps> = ({ amount, asset }) => {
  const buckets = depositorBucketGroups[asset.id];
  const activeBucketIdx = buckets.findIndex(b => b.lowerBound >= amount);
  const activeRowIdx = activeBucketIdx === -1 ? buckets.length : activeBucketIdx;
  return (
    <Root>
      <Header>
        <HeaderIcon url={asset.iconWhite} />
        <HeaderIcon url={usersIcon} />
        <Text size="s" text={asset.symbol} />
        <Text size="s" text="Users" />
      </Header>
      <HighlightCursor />
      <Body>
        <Rows style={{ transform: `translateY(${displaceForIdx(activeRowIdx)}px)` }}>
          {emptyRow}
          {emptyRow}
          {buckets.map((b, idx) => (
            <Row key={idx}>
              <Text size="s" text={fromBaseUnits(b.lowerBound, asset.decimals)} />
              <Text size="s" text={numberFormatter.format(b.count)} />
            </Row>
          ))}
          {emptyRow}
        </Rows>
        <Highlight />
      </Body>
    </Root>
  );
};
