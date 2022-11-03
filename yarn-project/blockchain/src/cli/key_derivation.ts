// AKI: Aztec Key Identifier
// e.g. aztec-connect-dev:general-accounts:falafel-rollup-signer

import { BIP85 } from 'bip85';
import { Wallet } from 'ethers';

function deployTagToIndex(deployTag: string) {
  switch (deployTag) {
    case 'aztec-connect-dev':
      return 0;
    case 'aztec-connect-testnet':
      return 1;
    case 'aztec-connect-prod':
      return 2;
    case 'mainnet-fork':
      return 3;
    default:
      return +deployTag;
  }
}

function walletNameToIndex(walletName: string) {
  switch (walletName) {
    case 'general-accounts':
      return 0;
    case 'wasabi-agents':
      return 1;
    default:
      return +walletName;
  }
}

function addressNameToIndex(addressName: string) {
  switch (addressName) {
    case 'falafel-rollup-signer':
      return 0;
    case 'wasabi-funder':
      return 1;
    case 'smoketest-client':
      return 2;
    default:
      return +addressName;
  }
}

export function akiToKey(mnemonic: string, aki: string) {
  const deployTagChild = BIP85.fromMnemonic(mnemonic);

  const [deployTag, walletName, addressName] = aki.split(':');
  if (!walletName) {
    return deployTagChild.deriveBIP39(0, 12, deployTagToIndex(deployTag)).toMnemonic();
  }

  const deployTagEntropy = deployTagChild.deriveBIP39(0, 12, deployTagToIndex(deployTag)).toEntropy();
  const walletChild = BIP85.fromEntropy(deployTagEntropy);
  const walletChildMnemonic = walletChild.deriveBIP39(0, 12, walletNameToIndex(walletName)).toMnemonic();
  if (!addressName) {
    return walletChildMnemonic;
  }

  return Wallet.fromMnemonic(walletChildMnemonic, `m/44'/60'/0'/0/${addressNameToIndex(addressName)}`).privateKey;
}
