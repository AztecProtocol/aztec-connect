import moment from 'moment';
import React from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { blockStatusColours, BlockStatusText, getBlockStatus } from '../block_status';
import { DeviceWidth, Text, contentStyle, contentHighlightStyle, contentPlaceholderStyle } from '../components';
import chevronRightIcon from '../images/chevron_right.svg';
import clockIcon from '../images/clock.svg';
import { TimeAgo } from '../relative_time';
import { spacings, sizeLte, fontSizes, lineHeights, colours, breakpoints } from '../styles';
import { Block } from './query';

const itemRootStyle = css`
  ${contentStyle}
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${spacings.xs} ${spacings.s};
  color: ${colours.white};

  @media (max-width: ${breakpoints.xs}) {
    flex-wrap: wrap;
  }
`;

const Root = styled(Link)`
  ${itemRootStyle}
  font-size: ${fontSizes.s};
  line-height: ${lineHeights.s};

  &:hover {
    ${contentHighlightStyle}
  }
`;

const blockElemStyle = css`
  margin: ${spacings.xxs};
`;

const BlockNo = styled(Text)`
  ${blockElemStyle}
  min-width: 60px;

  @media (max-width: ${breakpoints.xs}) {
    order: 1;
  }
`;

const BlockHash = styled(Text)`
  ${blockElemStyle}

  @media (max-width: ${breakpoints.xs}) {
    order: 2;
    padding-right: ${spacings.m};
  }
`;

const TxsRoot = styled.div`
  ${blockElemStyle}
  display: flex;
  align-items: flex-end;

  @media (max-width: ${breakpoints.xs}) {
    order: 5;
    padding-right: ${spacings.m};
  }
`;

const TxsNo = styled(Text)`
  padding-right: ${spacings.xxs};
  min-width: 14px;
  line-height: 1;
`;

const Unit = styled(Text)`
  font-size: ${fontSizes.xxs};
  line-height: 1;
`;

const TimeRoot = styled.div`
  display: flex;
  align-items: flex-end;
  min-width: 72px;

  @media (max-width: ${breakpoints.xs}) {
    order: 4;
    margin-left: auto;
    padding-right: ${spacings.m};
  }
`;

const Time = styled(Text)`
  padding-left: 2px;
  padding-right: 2px;
  line-height: 1;
`;

const Clock = styled.img`
  margin-right: ${spacings.xxs};
  height: 16px;
`;

const Divider = styled.div`
  ${blockElemStyle}
  width: 1px;
  height: ${fontSizes.m};
  background: ${colours.white};
  opacity: 0.5;
`;

const LineBreak = styled.div`
  width: 100%;
  order: 2;
`;

const StatusTag = styled(BlockStatusText)`
  ${blockElemStyle}
  letter-spacing: 1px;
  min-width: 100px;
  text-align: center;

  @media (max-width: ${breakpoints.xs}) {
    order: 3;
    text-align: left;
  }
`;

const ChevronRight = styled.img`
  ${blockElemStyle}
  height: 24px;

  @media (min-width: ${parseInt(breakpoints.xs) + 1}px) {
    margin-left: 0;
    margin-right: -${spacings.xxs};
  }

  @media (max-width: ${breakpoints.xs}) {
    position: absolute;
    right: ${spacings.xxs};
  }
`;

const BlockItemPlaceholderRoot = styled.div`
  ${itemRootStyle}
`;

const BlockNoPlaceholderRoot = styled.div`
  ${blockElemStyle}
  display: flex;
  align-items: center;
  height: ${lineHeights.m};

  @media (max-width: ${breakpoints.xs}) {
    width: 100%;
  }
`;

const BlockNoPlaceholder = styled.div`
  ${contentPlaceholderStyle}
  width: 40px;
  height: ${lineHeights.s};
`;

const StatusTagPlaceholder = styled.div`
  ${contentPlaceholderStyle}
  margin-right: ${spacings.xs};
  width: ${lineHeights.xs};
  height: ${lineHeights.s};

  @media (max-width: ${breakpoints.xs}) {
    margin: ${spacings.xxs};
    width: 80px;
  }
`;

export const BlockItemPlaceholder: React.FunctionComponent = () => (
  <BlockItemPlaceholderRoot>
    <BlockNoPlaceholderRoot>
      <BlockNoPlaceholder />
    </BlockNoPlaceholderRoot>
    <StatusTagPlaceholder />
  </BlockItemPlaceholderRoot>
);

interface BlockProps {
  block: Block;
}

export const BlockItem: React.FunctionComponent<BlockProps> = ({ block }) => {
  const { id, hash, numTxs, created } = block;
  const status = getBlockStatus(block);

  return (
    <DeviceWidth>
      {({ breakpoint }) => (
        <Root to={`/block/${id}`}>
          <BlockNo text={`${id}`} color={blockStatusColours[status]} size="m" weight="semibold" monospace />
          {(() => {
            let hashStr = hash;
            if (breakpoint === 'l') {
              hashStr = `${hash.slice(0, 40)}...${hash.slice(-6)}`;
            } else if (breakpoint === 'm') {
              hashStr = `${hash.slice(0, 24)}...${hash.slice(-6)}`;
            } else if (sizeLte(breakpoint, 's')) {
              hashStr = `${hash.slice(0, 8)}...${hash.slice(-6)}`;
            }
            return <BlockHash text={`0x${hashStr}`} weight="light" monospace />;
          })()}
          {breakpoint === 'xs' && <LineBreak />}
          {breakpoint !== 'xs' && <Divider />}
          <TxsRoot>
            <TxsNo text={`${numTxs} `} />
            <Unit text="txs" />
          </TxsRoot>
          <TimeAgo time={moment(created)}>
            {({ text }) => {
              const [, value, unit] = text.match(/^([0-9]{1,})(.+)$/) || ['', ''];
              return (
                <TimeRoot>
                  <Clock src={clockIcon} />
                  <Time text={value} />
                  <Unit text={unit} />
                </TimeRoot>
              );
            }}
          </TimeAgo>
          {breakpoint !== 'xs' && <Divider />}
          <StatusTag status={status} weight="semibold" />
          <ChevronRight src={chevronRightIcon} />
        </Root>
      )}
    </DeviceWidth>
  );
};
