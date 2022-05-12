import { BlockchainAsset } from '@aztec/sdk';
import daiIcon from '../images/dai_white.svg';
import ethIcon from '../images/ethereum_white.svg';
import renBTCIcon from '../images/renBTC_white.svg';
import wstEthIcon from '../images/wsteth_white.svg';

export interface ProofData {
  proofId: number;
  publicInput: bigint;
  publicOutput: bigint;
  assetId: number;
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

const scientificFormatter = new Intl.NumberFormat('en-GB', { notation: 'scientific' });

export function formatAsset(asset: BlockchainAsset | undefined, amount: bigint): string {
  if (!asset) return `${scientificFormatter.format(amount)} (units unknown)`;
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

export function assetIdFromBuffer(buffer: Buffer) {
  return buffer.readUInt32BE(28);
}

export function getAssetIcon(asset?: BlockchainAsset): string | undefined {
  if (!asset) return;
  switch (asset.address.toString()) {
    case '0x0000000000000000000000000000000000000000': // ETH
      return ethIcon;
    case '0x6B175474E89094C44Da98b954EedeAC495271d0F': // DAI
      return daiIcon;
    case '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D': // renBTC
      return renBTCIcon;
    case '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0': // wstETH
      return wstEthIcon;
  }
}

export function getBridgeProtocolName(addressId: number) {
  switch (addressId) {
    case 1:
      return 'Element Fixed Yield';
    case 2:
      return 'Lido Staking';
  }
}
