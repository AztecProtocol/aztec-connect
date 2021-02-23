import Mnemonic from 'bitcore-mnemonic';

export const generateSeedPhrase = (entropy: Buffer, size = 12) => {
  const seeds = new Mnemonic(entropy, Mnemonic.Words.ENGLISH).phrase.split(' ');
  if (seeds.length < size) {
    throw new Error(`Generated seed phrase is only ${seeds.length} words long. Expected ${size}.`);
  }
  return seeds.slice(0, size).join(' ');
};

interface ChecklistItem {
  validate(seeds: string[]): boolean;
  error: string;
}

const seedPhraseChecklist: ChecklistItem[] = [
  {
    validate: (seeds: string[]) => seeds.length === 12,
    error: 'There should be 12 words in a seed phrase.',
  },
];

export const formatSeedPhraseInput = (seedPhrase: string) => seedPhrase.replace(/\s+/g, ' ').trim();

export const sliceSeedPhrase = (seedPhraseInput: string, seedsPerRow = 4) => {
  const seeds = formatSeedPhraseInput(seedPhraseInput).split(' ');
  return Array(Math.ceil(seeds.length / seedsPerRow))
    .fill(0)
    .map((_, i) => seeds.slice(i * seedsPerRow, (i + 1) * seedsPerRow).join(' '))
    .join('\n');
};

export const isValidSeedPhraseInput = (seedPhraseInput: string) => {
  const seeds = formatSeedPhraseInput(seedPhraseInput).split(' ');
  return seedPhraseChecklist.every(({ validate }) => validate(seeds));
};

export const getSeedPhraseError = (seedPhraseInput: string) => {
  const seeds = formatSeedPhraseInput(seedPhraseInput).split(' ');
  return seedPhraseChecklist.find(({ validate }) => !validate(seeds))?.error;
};
