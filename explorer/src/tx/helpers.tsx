import daiIcon from '../images/dai_white.svg';
import ethIcon from '../images/ethereum_white.svg';
import renBTCIcon from '../images/renBTC_white.svg';
import { TransactionType } from '../proof_type';

export interface ProofData {
  proofId: number;
  publicInput: bigint;
  publicOutput: bigint;
  asset: Asset;
  newNote1: Buffer;
  newNote2: Buffer;
  nullifier1: Buffer;
  nullifier2: Buffer;
  inputOwner: string;
  outputOwner: string;
}

export interface Asset {
  name: string;
  icon: string;
  decimals: number;
}

const assets: Asset[] = [
  { name: 'ETH', decimals: 18, icon: ethIcon },
  { name: 'DAI', decimals: 18, icon: daiIcon },
  { name: 'renBTC', decimals: 8, icon: renBTCIcon },
];

export function formatAsset(asset: Asset, amount: bigint): string {
  return `${fromBaseUnits(amount, asset.decimals)} ${asset.name}`;
}

function fromBaseUnits(value: bigint, decimals: number, precision: number = decimals) {
  const neg = value < BigInt(0);
  const valStr = value
    .toString()
    .slice(neg ? 1 : 0)
    .padStart(decimals + 1, '0');
  const integer = valStr.slice(0, valStr.length - decimals);
  const fractionalTrim = valStr.slice(-decimals);
  let end = fractionalTrim.length - 1;
  while (fractionalTrim[end] === '0') --end;
  const fractional = fractionalTrim.slice(0, end + 1);
  return (neg ? '-' : '') + (fractional ? `${integer}.${fractional.slice(0, precision)}` : integer);
}

export function parseRawProofData(rawProofData: Buffer): ProofData {
  return {
    proofId: rawProofData.readUInt32BE(28),
    publicInput: toBigIntBE(rawProofData.slice(1 * 32, 1 * 32 + 32)),
    publicOutput: toBigIntBE(rawProofData.slice(2 * 32, 2 * 32 + 32)),
    asset: assets[Number(rawProofData.slice(3 * 32, 3 * 32 + 32).toString('hex'))],
    newNote1: rawProofData.slice(4 * 32, 4 * 32 + 64),
    newNote2: rawProofData.slice(6 * 32, 6 * 32 + 64),
    nullifier1: rawProofData.slice(8 * 32, 8 * 32 + 32),
    nullifier2: rawProofData.slice(9 * 32, 9 * 32 + 32),
    inputOwner: rawProofData.slice(10 * 32 + 12, 10 * 32 + 32).toString('hex'),
    outputOwner: rawProofData.slice(11 * 32 + 12, 11 * 32 + 32).toString('hex'),
  };
}

export const getTransactionType = (publicInput: bigint, publicOutput: bigint): TransactionType => {
  // this is only true for join splits,
  // as account txs repurpose publicInput and publicOutput values
  const isShield = publicInput > 0;
  const isWithdraw = publicOutput > 0;

  if (isShield) {
    return TransactionType.SHIELD;
  } else if (isWithdraw) {
    return TransactionType.WITHDRAW;
  }
  return TransactionType.PRIVATE_SEND;
};

export function toBigIntBE(buf: Buffer): bigint {
  const hex = buf.toString('hex');
  if (hex.length === 0) {
    return BigInt(0);
  }
  return BigInt(`0x${hex}`);
}
