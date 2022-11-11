import { EthAddress } from '@aztec/sdk';

interface ChecklistItem {
  validate(alias: string): boolean;
  error: string;
}

const aliasChecklist: ChecklistItem[] = [
  {
    validate: (alias: string) => !!alias,
    error: 'Alias cannot be empty.',
  },
  {
    validate: (alias: string) => !alias.match(/^0x/i),
    error: 'Alias cannot start with 0x.',
  },
  {
    validate: (alias: string) => !EthAddress.isAddress(alias),
    error: 'Alias cannot be an ethereum address.',
  },
  {
    validate: (alias: string) => alias.length <= 20,
    error: 'Alias cannot be longer than 20 characters.',
  },
  {
    validate: (alias: string) => !alias.match(/\s/),
    error: 'Alias cannot contain spaces.',
  },
];

export const formatAliasInput = (aliasInput: string) => aliasInput.toLowerCase();

export function validateAlias(alias: string) {
  const error = aliasChecklist.find(item => !item.validate(alias))?.error;
  if (error) return { valid: false, error };
  return { valid: true };
}

export const isValidAliasInput = (aliasInput: string) => {
  const alias = formatAliasInput(aliasInput);
  return aliasChecklist.every(({ validate }) => validate(alias));
};
