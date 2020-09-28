// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

interface IRollupProcessor {
    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        uint256[] calldata sigIndexes,
        bytes calldata viewingKeys
    ) external;

    function getSupportedAssetAddress(uint256 assetId) external view returns (address);

    function setSupportedAsset(address _linkedToken) external;

    function getNumSupportedAssets() external view returns (uint256);

    function getSupportedAssets() external view returns (address[] memory);
}
