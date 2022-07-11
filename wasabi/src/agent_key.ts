export interface AgentKeyInfo {
  mnemonic: string;
  account: number;
}

export function buildMnemonicPath(bip32Account: number, accountIndex: number) {
  return `m/44'/60'/${bip32Account}'/0/${accountIndex}`;
}
