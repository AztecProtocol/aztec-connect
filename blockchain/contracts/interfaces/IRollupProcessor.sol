// SPDX-License-Identifier: GPL-2.0-only

pragma solidity >=0.6.10 <0.7.0;

interface IRollupProcessor {
    function processRollup(bytes calldata proofData, bytes calldata viewingKeys, uint256 rollupSize) external;
}
