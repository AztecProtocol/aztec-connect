import { EthAddress } from '@aztec/sdk';

interface ChecklistItem {
  validate(alias: string): boolean;
  error: string;
}

const aliasChecklist: ChecklistItem[] = [
  {
    validate: (alias: string) => !!alias,
    error: 'Username cannot be empty.',
  },
  {
    validate: (alias: string) => !alias.match(/^0x/i),
    error: 'Username cannot start with 0x.',
  },
  {
    validate: (alias: string) => !EthAddress.isAddress(alias),
    error: 'Username cannot be an ethereum address.',
  },
  {
    validate: (alias: string) => alias.length <= 20,
    error: 'Username cannot be longer than 20 characters.',
  },
  {
    validate: (alias: string) => !alias.match(/\s/),
    error: 'Username cannot contain spaces.',
  },
];

export const formatAliasInput = (aliasInput: string) => aliasInput.toLowerCase();

export const isSameAlias = (alias0: string, alias1: string) => formatAliasInput(alias0) === formatAliasInput(alias1);

export const isValidAliasInput = (aliasInput: string) => {
  const alias = formatAliasInput(aliasInput);
  return aliasChecklist.every(({ validate }) => validate(alias));
};

export const getAliasError = (aliasInput: string) => {
  const alias = formatAliasInput(aliasInput);
  return aliasChecklist.find(({ validate }) => !validate(alias))?.error;
};
