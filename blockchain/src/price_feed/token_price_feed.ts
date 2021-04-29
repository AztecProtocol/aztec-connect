import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { PriceFeed } from 'barretenberg/blockchain';
import { Contract } from 'ethers';

const abi = [
  'function latestAnswer() public view returns(int256)',
  'function latestRound() public pure returns(uint256)',
  'function getRoundData(uint80 _roundId) public view returns(uint80,int256,uint256,uint256,uint80)',
];

export class TokenPriceFeed implements PriceFeed {
  private contract: Contract;

  constructor(priceFeedContractAddress: EthAddress, provider: Web3Provider) {
    this.contract = new Contract(priceFeedContractAddress.toString(), abi, provider);
  }

  async price() {
    return BigInt(await this.contract.latestAnswer());
  }

  async latestRound() {
    return BigInt(await this.contract.latestRound());
  }

  async getRoundData(roundId: bigint) {
    const [, answer, , updatedAt] = (await this.contract.getRoundData(roundId)) || [];
    return {
      roundId,
      price: BigInt(answer || 0),
      timestamp: +(updatedAt || 0),
    };
  }

  async getHistoricalPrice(roundId: bigint) {
    try {
      const data = await this.contract.getRoundData(roundId);
      return data ? BigInt(data[1]) : BigInt(0);
    } catch (e) {
      return BigInt(0);
    }
  }
}
