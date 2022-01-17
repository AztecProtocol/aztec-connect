// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract MockPriceFeed {
    uint80 latestRoundId = 1000;
    mapping(uint256 => int256) public getAnswer;
    mapping(uint256 => uint256) public getTimestamp;

    constructor(int256 answer) public {
        setRoundData(answer);
    }

    function latestAnswer() public view returns (int256) {
        return getAnswer[latestRoundId];
    }

    function latestRound() public view returns (uint256) {
        return latestRoundId;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        updatedAt = getTimestamp[_roundId];
        roundId = _roundId;
        answeredInRound = _roundId;
        startedAt = updatedAt;
        answer = getAnswer[_roundId];
    }

    function setRoundData(int256 answer) public {
        latestRoundId = latestRoundId + 1;
        getAnswer[latestRoundId] = answer;
        getTimestamp[latestRoundId] = block.timestamp;
    }
}
