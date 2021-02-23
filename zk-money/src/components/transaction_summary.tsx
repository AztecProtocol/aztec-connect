import moment from 'moment';
import React from 'react';
import styled from 'styled-components';
import linkIcon from '../images/link.svg';
import clockIcon from '../images/clock_white.svg';
import { breakpoints, fontSizes, spacings } from '../styles';
import { Dot } from './dot';
import { Link } from './link';
import { Tag } from './tag';
import { Text } from './text';
import { Tooltip } from './tooltip';

const Root = styled.div`
  display: flex;
  align-items: center;
  margin: 0 -${spacings.s};
  padding: ${spacings.xs} 0;
  font-size: ${fontSizes.s};

  @media (max-width: ${breakpoints.s}) {
    flex-wrap: wrap;
  }
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  padding: ${spacings.xs} ${spacings.s};
`;

const TagRoot = styled(Item)`
  display: flex;
  min-width: 200px;
  flex-shrink: 0;
  order: 1;

  @media (max-width: ${breakpoints.m}) {
    min-width: 160px;
  }

  @media (max-width: ${breakpoints.s}) {
    flex: 1;
  }
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  order: 2;

  @media (max-width: ${breakpoints.s}) {
    order: 4;
  }
`;

const ValueRoot = styled(Item)`
  min-width: 240px;
  margin: 0 -${spacings.xs};

  @media (max-width: ${breakpoints.m}) {
    min-width: 0px;
  }
`;

const Value = styled(Text)`
  padding: 0 ${spacings.xs};
`;

const HexRoot = styled(Item)`
  order: 3;

  @media (max-width: ${breakpoints.s}) {
    order: 5;
  }
`;

const StatusRoot = styled(Item)`
  margin: 0 -${spacings.m};
  display: flex;
  align-items: center;
  flex-shrink: 0;
  order: 4;

  @media (max-width: ${breakpoints.s}) {
    order: 2;
  }
`;

const StatusItem = styled.div`
  padding: 0 ${spacings.m};
`;

const LinkIcon = styled.img`
  width: 16px;
`;

const Divider = styled.div`
  order: 5;

  @media (max-width: ${breakpoints.s}) {
    width: 100%;
    order: 3;
  }
`;

const TimeRoot = styled(Text)`
  display: flex;
  align-items: center;
`;

const TimeIcon = styled.img`
  padding-right: ${spacings.xs};
  height: 16px;
`;

// Make it a component so that the value will be recalculated when the popup is open.
const RelativeTime: React.FunctionComponent<{ date: Date }> = ({ date }) => <>{moment(date).fromNow()}</>;

interface TransactionSummaryProps {
  className?: string;
  txHash: string;
  tag: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

const TransactionSummary: React.FunctionComponent<TransactionSummaryProps> = ({
  className,
  txHash,
  tag,
  link,
  children,
  publishTime,
  settled,
}) => (
  <div className={className}>
    <Root>
      <TagRoot>
        <Tag text={tag} />
      </TagRoot>
      <InfoWrapper>{children}</InfoWrapper>
      <HexRoot>
        <Text text={`${txHash.slice(0, 6)}...${txHash.slice(-4)}`} monospace />
      </HexRoot>
      <StatusRoot>
        <StatusItem>
          <Link href={link} target="_blank">
            <LinkIcon src={linkIcon} />
          </Link>
        </StatusItem>
        <StatusItem>
          <Tooltip trigger={<Dot size="s" color={settled ? 'green' : 'yellow'} />} pivot="topright">
            {settled && (
              <TimeRoot size="xxs" nowrap>
                <TimeIcon src={clockIcon} />
                <RelativeTime date={settled} />
              </TimeRoot>
            )}
            {!settled && !!publishTime && (
              <Text size="xxs" nowrap>
                {'Scheduled to publish '}
                <RelativeTime date={publishTime} />
              </Text>
            )}
          </Tooltip>
        </StatusItem>
      </StatusRoot>
      <Divider />
    </Root>
  </div>
);

interface JoinSplitTxSummaryProps {
  className?: string;
  txHash: string;
  action: string;
  value: string;
  symbol: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

export const JoinSplitTxSummary: React.FunctionComponent<JoinSplitTxSummaryProps> = ({
  className,
  txHash,
  action,
  value,
  symbol,
  link,
  publishTime,
  settled,
}) => (
  <TransactionSummary
    className={className}
    txHash={txHash}
    tag={action.toUpperCase()}
    link={link}
    publishTime={publishTime}
    settled={settled}
  >
    <ValueRoot>
      <Value text={value} monospace />
      <Text text={`zk${symbol}`} />
    </ValueRoot>
  </TransactionSummary>
);

interface AccountTxSummaryProps {
  className?: string;
  txHash: string;
  action: string;
  link: string;
  publishTime?: Date;
  settled?: Date;
}

export const AccountTxSummary: React.FunctionComponent<AccountTxSummaryProps> = ({
  className,
  txHash,
  action,
  link,
  publishTime,
  settled,
}) => (
  <TransactionSummary
    className={className}
    txHash={txHash}
    tag="ACCOUNT"
    link={link}
    publishTime={publishTime}
    settled={settled}
  >
    <Item>
      <Text text={action} nowrap />
    </Item>
  </TransactionSummary>
);
