import { EthAddress } from '@aztec/barretenberg/address/eth_address';
import { EthereumRpc } from '@aztec/barretenberg/blockchain/ethereum_rpc';
import { utils } from 'ethers';

export class HardhatRpc extends EthereumRpc {
  public async setStorageAt(addr: EthAddress, slot: bigint, value: bigint): Promise<any> {
    const result = await this.provider.request({
      method: 'hardhat_setStorageAt',
      params: [addr.toString(), '0x' + slot.toString(16), utils.defaultAbiCoder.encode(['uint'], [value])],
    });
    return result;
  }
}
