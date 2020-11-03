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

    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address owner
    ) external;

    function depositPendingFundsPermit(
        uint256 assetId,
        uint256 amount,
        address owner,
        address spender,
        uint256 permitApprovalAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function getSupportedAssetAddress(uint256 assetId) external view returns (address);

    function setSupportedAsset(address linkedToken, bool supportsPermit) external;

    function getNumSupportedAssets() external view returns (uint256);

    function getSupportedAssets() external view returns (address[] memory);

    function getAssetPermitSupport(uint256 assetId) external view returns (bool);

    function getEscapeHatchStatus() external view returns (bool, uint256);

    function getUserPendingDeposit(uint256 assetId, address userAddress) external view returns (uint256);
}
