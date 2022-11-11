import { EthAddress } from '@aztec/sdk';

export function formatEthAddress(address: EthAddress) {
  const addressStr = address.toString();
  return `${addressStr.substring(0, 5)}...${addressStr.substring(addressStr.length - 4)}`;
}
