import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, BlockchainAsset, EthereumProvider, SendTxOptions, TxHash } from '@aztec/barretenberg/blockchain';
import { ContractTransaction } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { fromBaseUnits, toBaseUnits } from '../../units';

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

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

export class TokenAsset implements Asset {
  private erc20!: Contract;
  private precision = 2;

  constructor(private ethereumProvider: EthereumProvider, private info: BlockchainAsset, private minConfirmations = 1) {
    this.erc20 = new Contract(info.address.toString(), abi, new Web3Provider(ethereumProvider));
  }

  get address() {
    return this.info.address;
  }

  get contract() {
    return this.erc20;
  }

  static async fromAddress(
    address: EthAddress,
    ethereumProvider: EthereumProvider,
    permitSupport: boolean,
    minConfirmations = 1,
  ) {
    const contract = new Contract(address.toString(), abi, new Web3Provider(ethereumProvider));
    const info = {
      address,
      name: await contract.name(),
      symbol: await contract.symbol(),
      decimals: +(await contract.decimals()),
      permitSupport,
      gasConstants: [5000, 0, 36000, 36000, 0, 36000, 36000],
    };
    return new TokenAsset(ethereumProvider, info, minConfirmations);
  }

  getStaticInfo() {
    return this.info;
  }

  async getUserNonce(account: EthAddress) {
    return BigInt(await this.erc20.nonces(account.toString()));
  }

  async balanceOf(account: EthAddress) {
    const balance = await this.erc20.balanceOf(account.toString());
    return BigInt(balance);
  }

  async allowance(owner: EthAddress, receiver: EthAddress) {
    const allowance = await this.erc20.allowance(owner.toString(), receiver.toString());
    return BigInt(allowance);
  }

  async approve(value: bigint, owner: EthAddress, receiver: EthAddress, options: SendTxOptions = {}) {
    const contract = this.getContractWithSigner(owner, options);
    const res = (await contract.approve(receiver.toString(), value).catch(fixEthersStackTrace)) as ContractTransaction;
    const receipt = await res.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async mint(value: bigint, account: EthAddress, options: SendTxOptions = {}) {
    const contract = this.getContractWithSigner(account, options);
    const res = await contract.mint(account.toString(), value).catch(fixEthersStackTrace);
    const receipt = await res.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  async transfer(value: bigint, from: EthAddress, to: EthAddress, options: SendTxOptions = {}) {
    const contract = this.getContractWithSigner(from, options);
    const res = await contract.transfer(from.toString(), to.toString(), value).catch(fixEthersStackTrace);
    const receipt = await res.wait(this.minConfirmations);
    return TxHash.fromString(receipt.transactionHash);
  }

  public fromBaseUnits(value: bigint, precision = this.precision) {
    return fromBaseUnits(value, this.info.decimals, precision);
  }

  public toBaseUnits(value: string) {
    return toBaseUnits(value, this.info.decimals);
  }

  private getContractWithSigner(account: EthAddress, options: SendTxOptions) {
    const { provider = this.ethereumProvider, signingAddress = account } = options;
    const ethSigner = new Web3Provider(provider).getSigner(signingAddress.toString());
    return new Contract(this.info.address.toString(), abi, ethSigner);
  }
}
