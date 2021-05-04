import { ContractTransaction } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { Asset, BlockchainAsset } from 'barretenberg/blockchain';
import { TxHash } from 'barretenberg/tx_hash';
import { Contract } from 'ethers';
import { EthereumProvider } from '../provider';
import { fromBaseUnits, toBaseUnits } from '../units';

const abi = [
  'function decimals() public view returns (uint8)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function mint(address _to, uint256 _value) public returns (bool)',
  'function name() public view returns (string)',
  'function symbol() public view returns (string)',
  'function nonces(address) public view returns(uint256)',
];

export class TokenAsset implements Asset {
  private contract!: Contract;
  private precision = 2;

  constructor(private ethersProvider: Web3Provider, private info: BlockchainAsset, private minConfirmations = 1) {
    this.contract = new Contract(info.address.toString(), abi, ethersProvider);
  }

  static async fromAddress(
    address: EthAddress,
    ethersProvider: Web3Provider,
    permitSupport: boolean,
    minConfirmations = 1,
  ) {
    const contract = new Contract(address.toString(), abi, ethersProvider);
    const info = {
      address,
      name: await contract.name(),
      symbol: await contract.symbol(),
      decimals: +(await contract.decimals()),
      permitSupport,
      gasConstants: [5000, 0, 36000, 36000],
    };
    return new TokenAsset(ethersProvider, info, minConfirmations);
  }

  getStaticInfo() {
    return this.info;
  }

  async getUserNonce(account: EthAddress) {
    return BigInt(await this.contract.nonces(account.toString()));
  }

  async balanceOf(account: EthAddress) {
    const balance = await this.contract.balanceOf(account.toString());
    return BigInt(balance);
  }

  async allowance(owner: EthAddress, receiver: EthAddress) {
    const allowance = await this.contract.allowance(owner.toString(), receiver.toString());
    return BigInt(allowance);
  }

  async approve(value: bigint, owner: EthAddress, receiver: EthAddress, provider?: EthereumProvider) {
    const contract = this.getContractWithSigner(owner, provider);
    const res = (await contract.approve(receiver.toString(), value)) as ContractTransaction;
    const receipt = await res.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async mint(value: bigint, account: EthAddress, provider?: EthereumProvider) {
    const contract = this.getContractWithSigner(account, provider);
    const res = await contract.mint(account.toString(), value);
    const receipt = await res.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  public fromBaseUnits(value: bigint, precision = this.precision) {
    return fromBaseUnits(value, this.info.decimals, precision);
  }

  public toBaseUnits(value: string) {
    return toBaseUnits(value, this.info.decimals);
  }

  private getContractWithSigner(account: EthAddress, provider?: EthereumProvider) {
    const ethSigner = (provider ? new Web3Provider(provider) : this.ethersProvider).getSigner(account.toString());
    return new Contract(this.info.address.toString(), abi, ethSigner);
  }
}
