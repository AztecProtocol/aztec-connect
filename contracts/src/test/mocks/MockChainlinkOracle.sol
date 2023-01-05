import {IChainlinkOracle} from "bridge-interfaces/chainlink/IChainlinkOracle.sol";

contract MockChainlinkOracle {
    // is IChainlinkOracle

    int256 public immutable price;

    constructor(int256 _price) {
        price = _price;
    }

    function latestAnswer() external view returns (int256) {
        return price;
    }

    function getAnswer(uint256) external view returns (int256) {
        return this.latestAnswer();
    }

    function latestRound() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (
            uint80(1), // roundId
            price, // answer
            block.timestamp - 1, // startedAt
            block.timestamp, // updatedAt
            uint80(1) // answeredInRound
        );
    }

    function getRoundData(uint256) external view returns (uint80, int256, uint256, uint256, uint80) {
        return this.latestRound();
    }
}
