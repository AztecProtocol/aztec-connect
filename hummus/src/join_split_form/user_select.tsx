import React, { useState } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import { FlexBox, Block, SelectInput, Icon, Text } from '@aztec/guacamole-ui';
import { FormField } from '../components';
import { ThemeContext } from '../config/context';
import { User } from 'aztec2-sdk';

interface UserSelectProps {
  users: User[];
  user: User;
  onSelect: (value: string) => void;
}

export const UserSelect = ({ users, user, onSelect }: UserSelectProps) => {
  const [justCopied, setJustCopied] = useState(false);

  const userItems = users
    .map(({ id, publicKey }) => ({
      value: `${id}`,
      title: publicKey.toString('hex').replace(/^(.{58})(.+)(.{4})$/, '$1...$3'),
    }))
    .concat([
      {
        value: 'new',
        // @ts-ignore
        title: <Text text="Create new user" color="secondary" size="xs" />,
      },
    ]);

  return (
    <ThemeContext.Consumer>
      {({ theme, link }) => (
        <FormField label="User">
          <FlexBox valign="center">
            <SelectInput
              className="flex-free-expand"
              theme={theme === 'dark' ? 'dark' : 'default'}
              size="s"
              menuBorderColor="white-lighter"
              menuOffsetTop="xxs"
              itemGroups={[
                {
                  items: userItems,
                },
              ]}
              value={`${user!.id}`}
              onSelect={(v: string) => onSelect(v)}
              highlightSelected={theme === 'light'}
            />
            <Block left="m">
              <CopyToClipboard
                text={user!.publicKey.toString('hex')}
                onCopy={() => {
                  if (justCopied) return;
                  setJustCopied(true);
                  setTimeout(() => {
                    setJustCopied(false);
                  }, 1500);
                }}
              >
                <span style={{ position: 'relative', cursor: 'pointer' }} title="Click to copy">
                  <Icon name="launch" color={justCopied ? 'transparent' : link} />
                  {justCopied && (
                    <span style={{ position: 'absolute', left: '-4px' }}>
                      <Text text="Copied!" color={theme === 'dark' ? 'white' : 'green'} size="xxs" />
                    </span>
                  )}
                </span>
              </CopyToClipboard>
            </Block>
          </FlexBox>
        </FormField>
      )}
    </ThemeContext.Consumer>
  );
};
