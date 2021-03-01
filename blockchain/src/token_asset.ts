import { ContractTransaction } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/tx_hash';
import { Contract } from 'ethers';
import { fromBaseUnits, toBaseUnits } from './units';
import { Asset, BlockchainAsset } from 'barretenberg/blockchain';

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
  private info!: BlockchainAsset;
  private precision = 2;
  private confirmations = 2;

  constructor(private ethersProvider: Web3Provider, private contractAddress: EthAddress) {
    this.contract = new Contract(contractAddress.toString(), abi, ethersProvider);
  }

  async init(permitSupport: boolean) {
    const chainId = (await this.ethersProvider.getNetwork()).chainId;
    // If ganache, just 1 confirmation.
    if (chainId === 1337 || chainId === 31337) {
      this.confirmations = 1;
    }

    this.info = {
      address: this.contractAddress,
      name: await this.contract.name(),
      symbol: await this.contract.symbol(),
      decimals: +(await this.contract.decimals()),
      permitSupport,
      gasConstants: [25000, 0, 25000, 25000],
    };
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

  async approve(value: bigint, owner: EthAddress, receiver: EthAddress) {
    const signer = this.ethersProvider.getSigner(owner.toString());
    const contract = new Contract(this.contractAddress.toString(), abi, signer);
    const res = (await contract.approve(receiver.toString(), value)) as ContractTransaction;
    const receipt = await res.wait(this.confirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async mint(value: bigint, account: EthAddress) {
    const signer = this.ethersProvider.getSigner(account.toString());
    const contract = new Contract(this.contractAddress.toString(), abi, signer);
    const res = await contract.mint(account.toString(), value);
    const receipt = await res.wait(this.confirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  public fromBaseUnits(value: bigint, precision = this.precision) {
    return fromBaseUnits(value, this.info.decimals, precision);
  }

  public toBaseUnits(value: string) {
    return toBaseUnits(value, this.info.decimals);
  }
}
