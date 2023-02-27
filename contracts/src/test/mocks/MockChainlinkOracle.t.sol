import {MockChainlinkOracle} from "mocks/MockChainlinkOracle.sol";
import {TestBase} from "../aztec/TestBase.sol";

/**
 * Mock Chainlink Oracle Test
 *
 * Lightweight test for the MockChainlinkOracle contract
 */
contract MockChainLinkOracleTest is TestBase {
    MockChainlinkOracle oracle;

    function setUp() public override {
        oracle = new MockChainlinkOracle(1000000000000000000);
    }

    function testLatestAnswer() public {
        assertEq(oracle.latestAnswer(), 1000000000000000000);
    }

    function testGetAnswer() public {
        assertEq(oracle.getAnswer(1), 1000000000000000000);
    }

    function testLatestRound() public {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            oracle.latestRound();
        assertEq(roundId, 1);
        assertEq(answer, 1000000000000000000);
        assertEq(startedAt, block.timestamp - 1);
        assertEq(updatedAt, block.timestamp);
        assertEq(answeredInRound, 1);
    }

    function testGetRoundData() public {
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) =
            oracle.getRoundData(1);
        assertEq(roundId, 1);
        assertEq(answer, 1000000000000000000);
        assertEq(startedAt, block.timestamp - 1);
        assertEq(updatedAt, block.timestamp);
        assertEq(answeredInRound, 1);
    }
}
