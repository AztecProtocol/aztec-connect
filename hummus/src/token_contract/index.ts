import { Contract, ethers } from 'ethers';

const minimalERC20ABI = [
  'function decimals() public view returns (uint8)',
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) public view returns (uint256)',
  'function balanceOf(address account) public view returns (uint256)',
  'function mint(address _to, uint256 _value) public returns (bool)',
];

export class TokenContract {
  private contract: Contract;
  public decimals = 0;

  constructor(contractAddress: string, private noteScalingFactor: bigint) {
    const provider = new ethers.providers.Web3Provider(window.web3.currentProvider);
    this.contract = new Contract(contractAddress, minimalERC20ABI, provider.getSigner());
  }

  async init() {
    const decimals = await this.contract.decimals();
    this.decimals = +decimals;
  }

  getDecimals() {
    return this.decimals;
  }

  async balanceOf(account: string) {
    const balance = await this.contract.balanceOf(account);
    return this.toNoteValue(BigInt(balance));
  }

  async allowance(owner: string, spender: string) {
    const allowance = await this.contract.allowance(owner, spender);
    return this.toNoteValue(BigInt(allowance));
  }

  async approve(spender: string, value: bigint) {
    const res = await this.contract.approve(spender, this.toScaledTokenValue(value));
    await res.wait();
  }

  async mint(account: string, value: bigint) {
    const res = await this.contract.mint(account, this.toScaledTokenValue(value));
    await res.wait();
  }

  public toScaledTokenValue(noteValue: bigint) {
    return noteValue * this.noteScalingFactor;
  }

  public toNoteValue(scaledTokenValue: bigint) {
    return scaledTokenValue / this.noteScalingFactor;
  }
}
