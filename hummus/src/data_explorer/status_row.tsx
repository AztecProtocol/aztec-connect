import React from 'react';
import moment from 'moment';
import { Row, Col, Block, FlexBox, Avatar, Text } from '@aztec/guacamole-ui';
import { MonospacedText } from '../components';
import { ThemeContext } from '../config/context';
import { RelativeTime } from './relative_time';

const statusColorMapping: { [key: string]: string } = {
  PUBLISHED: 'yellow',
  SETTLED: 'green',
};

interface TmpRowProps {
  iconName: string;
  iconColor: string;
  created: Date;
  status: string;
  statusColor?: string;
  children: React.ReactNode;
}

export const TmpRow = ({ iconName, iconColor, children, status, statusColor, created }: TmpRowProps) => (
  <ThemeContext.Consumer>
    {({ theme, colorLight }) => (
      <Row valign="center">
        <Col column={{ s: children ? 5 : 9, xxs: children ? 12 : 8 }}>
          <Block padding="xs 0">
            <FlexBox valign="center">
              <Avatar
                className="flex-fixed"
                shape="square"
                iconName={iconName}
                iconBackground={theme === 'light' ? 'primary-lightest' : 'grey-dark'}
                color={iconColor}
              />
              <Block left="s">
                <Block padding="xxs 0">
                  <Text text="-" color={colorLight} />
                </Block>
                <RelativeTime time={moment(created)} color={colorLight} />
              </Block>
            </FlexBox>
          </Block>
        </Col>
        {!!children && (
          <Col column={{ s: 4, xxs: 6 }}>
            <Block padding="xs 0">{children}</Block>
          </Col>
        )}
        <Col column={{ s: 3, xxs: children ? 6 : 4 }}>
          <Block padding="xs 0">
            <FlexBox valign="center" align="flex-end">
              <Block right="m">
                <Text text={status} size="xxs" color={colorLight} />
              </Block>
              <Block padding="xxs" background={statusColor || colorLight} borderRadius="circular" inline />
            </FlexBox>
          </Block>
        </Col>
      </Row>
    )}
  </ThemeContext.Consumer>
);

interface StatusRowProps {
  iconShape?: 'circular' | 'square';
  iconName?: string;
  iconBackground?: string;
  iconColor?: string;
  alt?: string;
  id: React.ReactNode;
  caption?: string;
  created: Date;
  status: string;
  children?: React.ReactNode;
}

export const StatusRow = ({
  iconShape = 'circular',
  iconName,
  iconBackground,
  iconColor,
  alt,
  id,
  caption,
  created,
  status,
  children,
}: StatusRowProps) => (
  <ThemeContext.Consumer>
    {({ theme, colorLight }) => (
      <Row valign="center">
        <Col column={{ s: children ? 5 : 9, xxs: children ? 12 : 8 }}>
          <Block padding="xs 0">
            <FlexBox valign="center">
              <Avatar
                className="flex-fixed"
                shape={iconShape}
                alt={alt}
                iconName={iconName}
                iconBackground={iconBackground || (theme === 'light' ? 'primary-lightest' : 'grey-dark')}
                color={iconColor || (theme === 'light' ? 'grey' : 'white-lighter')}
              />
              <Block left="s">
                <Block padding="xxs 0">
                  <FlexBox valign="center">
                    <Block right="s">
                      <MonospacedText text={id} />
                    </Block>
                    {caption && <Text text={caption} color={colorLight} />}
                  </FlexBox>
                </Block>
                {!!created && <RelativeTime time={moment(created)} color={colorLight} />}
              </Block>
            </FlexBox>
          </Block>
        </Col>
        {!!children && (
          <Col column={{ s: 4, xxs: 6 }}>
            <Block padding="xs 0">{children}</Block>
          </Col>
        )}
        <Col column={{ s: 3, xxs: children ? 6 : 4 }}>
          <Block padding="xs 0">
            <FlexBox valign="center" align="flex-end">
              <Block right="m">
                <Text text={status} size="xxs" color={status === 'SETTLED' ? '' : colorLight} />
              </Block>
              <Block
                padding="xxs"
                background={statusColorMapping[status] || colorLight}
                borderRadius="circular"
                inline
              />
            </FlexBox>
          </Block>
        </Col>
      </Row>
    )}
  </ThemeContext.Consumer>
);
