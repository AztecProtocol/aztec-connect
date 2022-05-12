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
  private readonly precision = 2;

  constructor(
    private readonly info: BlockchainAsset,
    private readonly erc20: Contract,
    private readonly ethereumProvider: EthereumProvider,
    private readonly minConfirmations = 1,
  ) {}

  static new(info: BlockchainAsset, ethereumProvider: EthereumProvider, minConfirmations?: number) {
    const erc20 = new Contract(info.address.toString(), abi, new Web3Provider(ethereumProvider));
    return new TokenAsset(info, erc20, ethereumProvider, minConfirmations);
  }

  static async fromAddress(
    address: EthAddress,
    ethereumProvider: EthereumProvider,
    gasLimit: number,
    isFeePaying: boolean,
    minConfirmations?: number,
  ) {
    const erc20 = new Contract(address.toString(), abi, new Web3Provider(ethereumProvider));
    const info = {
      address,
      name: await erc20.name(),
      symbol: await erc20.symbol(),
      decimals: +(await erc20.decimals()),
      gasLimit,
      isFeePaying,
      gasConstants: isFeePaying ? [5000, 0, 36000, 36000, 0, 36000, 36000] : [],
    };
    return new TokenAsset(info, erc20, ethereumProvider, minConfirmations);
  }

  get address() {
    return this.info.address;
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

  public fromBaseUnits(value: bigint, precision?: number) {
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
