import { BIP85 } from 'bip85';
import { Wallet } from 'ethers';

interface MnemonicKeyDef {
  name: string;
  type: 'mnemonic';
  length: 12 | 18 | 24;
  children: KeyDef[];
}

interface SimpleKeyDef {
  name: string;
  type: 'hex' | 'base64';
  length: number;
}

interface EthKeyPairDef {
  name: string;
  type: 'eth_keypair';
}

type KeyDef = MnemonicKeyDef | SimpleKeyDef | EthKeyPairDef;

interface MnemonicKeyResult {
  name: string;
  type: 'mnemonic';
  value: string;
  children: KeyResult[];
}

interface SimpleKeyResult {
  name: string;
  type: 'hex' | 'base64';
  value: string;
}

interface EthKeyPairResult {
  name: string;
  type: 'eth_keypair';
  privateKey: string;
  address: string;
}

type KeyResult = MnemonicKeyResult | SimpleKeyResult | EthKeyPairResult;

function deriveKey(mnemonic: string, index: number, keyDef: KeyDef): KeyResult {
  const bip85 = BIP85.fromMnemonic(mnemonic);
  const { name, type } = keyDef;

  switch (type) {
    case 'mnemonic': {
      const { length, children } = keyDef;
      const value = bip85.deriveBIP39(0, length, index).toMnemonic();
      return {
        name,
        type,
        value: bip85.deriveBIP39(0, length, index).toMnemonic(),
        children: children.map((c, i) => deriveKey(value, i, c)),
      };
    }
    case 'hex':
      return { name, type, value: bip85.deriveHex(keyDef.length / 2, index).toEntropy() };
    case 'base64':
      return {
        name,
        type,
        value: Buffer.from(bip85.deriveHex(keyDef.length, index).toEntropy(), 'hex')
          .toString('base64')
          .slice(0, keyDef.length),
      };
    case 'eth_keypair': {
      const { privateKey, address } = Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`);
      return { name, type, privateKey, address };
    }
  }
}

interface EnvVar {
  key: string;
  value: string;
}

function flattenToEnvVars(keyResult: KeyResult, prefix = ''): EnvVar[] {
  const key = prefix + keyResult.name;

  switch (keyResult.type) {
    case 'mnemonic': {
      const { value, children } = keyResult;
      return [
        {
          key: key + '_MNEMONIC',
          value,
        },
        ...children.flatMap(c => flattenToEnvVars(c, key + '_')),
      ];
    }
    case 'hex':
    case 'base64': {
      const { value } = keyResult;
      return [{ key, value }];
    }
    case 'eth_keypair': {
      const { privateKey, address } = keyResult;
      return [
        { key: key + '_PRIVATE_KEY', value: privateKey },
        { key: key + '_ADDRESS', value: address },
      ];
    }
  }
}

/**Derive Deployment Keys
 *
 * @notice Keys listed below are specific to Aztec Connect. If running any other
 *         service they will need to be updated accordingly.
 *
 * @param mnemonic
 * @returns
 */
export function deriveDeploymentKeys(mnemonic: string) {
  const keyDefs: KeyDef[] = [
    {
      name: 'DEV',
      type: 'mnemonic',
      length: 12,
      children: [
        { name: 'KEBAB_API_KEY', type: 'hex', length: 32 },
        { name: 'FORK_API_KEY', type: 'hex', length: 32 },
        {
          name: 'FORK',
          type: 'mnemonic',
          length: 12,
          children: [
            { name: 'CONTRACTS_DEPLOYER', type: 'eth_keypair' },
            { name: 'FAUCET_OPERATOR', type: 'eth_keypair' },
            { name: 'ROLLUP_PROVIDER', type: 'eth_keypair' },
          ],
        },
        { name: 'NEXTAUTH_JWT_SECRET', type: 'hex', length: 32 },
      ],
    },
    {
      name: 'TEST',
      type: 'mnemonic',
      length: 12,
      children: [
        { name: 'KEBAB_API_KEY', type: 'hex', length: 32 },
        { name: 'FORK_API_KEY', type: 'hex', length: 32 },
        {
          name: 'FORK',
          type: 'mnemonic',
          length: 12,
          children: [
            { name: 'CONTRACTS_DEPLOYER', type: 'eth_keypair' },
            { name: 'FAUCET_OPERATOR', type: 'eth_keypair' },
            { name: 'ROLLUP_PROVIDER', type: 'eth_keypair' },
          ],
        },
        { name: 'SERVER_AUTH_TOKEN', type: 'base64', length: 16 },
        { name: 'NEXTAUTH_JWT_SECRET', type: 'hex', length: 32 },
      ],
    },
    {
      name: 'PROD',
      type: 'mnemonic',
      length: 12,
      children: [
        { name: 'ROLLUP_PROVIDER', type: 'eth_keypair' },
        { name: 'SERVER_AUTH_TOKEN', type: 'base64', length: 16 },
      ],
    },
    { name: 'DOCKERHUB_PASSWORD', type: 'base64', length: 20 },
  ];

  const envVarToShellExport = ({ key, value }: EnvVar) => `export ${key}=${value}`;
  const toTfEnvVar = ({ key, value }: EnvVar) => ({ key: 'TF_VAR_' + key, value });

  const envVars = keyDefs.map((k, i) => deriveKey(mnemonic, i, k)).flatMap(r => flattenToEnvVars(r));
  return [...envVars, ...envVars.map(toTfEnvVar)].map(envVarToShellExport).join('\n');
}
