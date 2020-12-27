import { ContractTransaction } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { TxHash } from 'barretenberg/rollup_provider';
import { Contract } from 'ethers';
import { TokenContract } from '.';
import { fromErc20Units, toErc20Units } from './units';

const minimalERC20ABI = [
  'function decimals() public view returns (uint8)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function mint(address _to, uint256 _value) public returns (bool)',
  'function name() public view returns (string)',
];

export class Web3TokenContract implements TokenContract {
  private contract!: Contract;
  private decimals = 0;
  private precision = 2;
  private confirmations = 2;

  constructor(
    private ethersProvider: Web3Provider,
    private contractAddress: EthAddress,
    private rollupContractAddress: EthAddress,
    private chainId: number,
  ) {
    this.contract = new Contract(contractAddress.toString(), minimalERC20ABI, ethersProvider);

    // If ganache, just 1 confirmation.
    if (chainId === 1337 || chainId === 31337) {
      this.confirmations = 1;
    }
  }

  async init() {
    const decimals = await this.contract.decimals();
    this.decimals = +decimals;
  }

  getDecimals() {
    return this.decimals;
  }

  getAddress() {
    return this.contractAddress;
  }

  async balanceOf(account: EthAddress) {
    const balance = await this.contract.balanceOf(account.toString());
    return BigInt(balance);
  }

  async allowance(owner: EthAddress) {
    await this.checkProviderChain();
    const allowance = await this.contract.allowance(owner.toString(), this.rollupContractAddress.toString());
    return BigInt(allowance);
  }

  async approve(value: bigint, account: EthAddress) {
    await this.checkProviderChain();
    const signer = this.ethersProvider.getSigner(account.toString());
    const contract = new Contract(this.contractAddress.toString(), minimalERC20ABI, signer);
    const res = (await contract.approve(this.rollupContractAddress.toString(), value)) as ContractTransaction;
    const receipt = await res.wait(this.confirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async mint(value: bigint, account: EthAddress) {
    await this.checkProviderChain();
    const signer = this.ethersProvider.getSigner(account.toString());
    const contract = new Contract(this.contractAddress.toString(), minimalERC20ABI, signer);
    const res = await contract.mint(account.toString(), value);
    const receipt = await res.wait(this.confirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async name() {
    await this.checkProviderChain();
    return this.contract.name() as string;
  }

  private async checkProviderChain() {
    const { chainId } = await this.ethersProvider.getNetwork();
    if (this.chainId != chainId) {
      throw new Error(`Set provider to correct network: ${chainId}`);
    }
  }

  public fromErc20Units(value: bigint, precision = this.precision) {
    return fromErc20Units(value, this.decimals, precision);
  }

  public toErc20Units(value: string) {
    return toErc20Units(value, this.decimals);
  }
}
