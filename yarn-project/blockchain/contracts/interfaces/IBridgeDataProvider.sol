// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

interface IBridgeDataProvider {
    struct BridgeData {
        address bridgeAddress;
        uint256 bridgeAddressId;
        string label;
    }

    function getAccumulatedSubsidyAmount(uint256 _bridgeCallData) external view returns (uint256, uint256);
    function getBridge(uint256 _bridgeAddressId) external view returns (BridgeData memory);
}
