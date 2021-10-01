// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

interface IRollupProcessor {
    function defiBridgeProxy() external view returns (address);

    function feeDistributor() external view returns (address);

    function escapeHatch(
        bytes calldata proofData,
        bytes calldata signatures,
        bytes calldata offchainTxData
    ) external;

    function processRollup(
        bytes calldata proofData,
        bytes calldata signatures,
        bytes calldata offchainTxData,
        bytes calldata providerSignature,
        address provider,
        address payable feeReceiver,
        uint256 feeLimit
    ) external;

    function depositPendingFunds(
        uint256 assetId,
        uint256 amount,
        address owner,
        bytes32 proofHash
    ) external payable;

    function depositPendingFundsPermit(
        uint256 assetId,
        uint256 amount,
        address owner,
        bytes32 proofHash,
        address spender,
        uint256 permitApprovalAmount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function setRollupProvider(address provderAddress, bool valid) external;

    function approveProof(bytes32 _proofHash) external;

    function setDefiBridgeProxy(address feeDistributorAddress) external;

    function setFeeDistributor(address feeDistributorAddress) external;

    function setGasSentToDefiBridgeProxy(uint256 _gasSentToBridgeProxy) external;

    function setVerifier(address verifierAddress) external;

    function setSupportedAsset(address linkedToken, bool supportsPermit) external;

    function setAssetPermitSupport(uint256 assetId, bool supportsPermit) external;

    function getSupportedAsset(uint256 assetId) external view returns (address);

    function getSupportedAssets() external view returns (address[] memory);

    function getTotalDeposited() external view returns (uint256[] memory);

    function getTotalWithdrawn() external view returns (uint256[] memory);

    function getTotalPendingDeposit() external view returns (uint256[] memory);

    function getTotalFees() external view returns (uint256[] memory);

    function getAssetPermitSupport(uint256 assetId) external view returns (bool);

    function getEscapeHatchStatus() external view returns (bool, uint256);

    function getUserPendingDeposit(uint256 assetId, address userAddress) external view returns (uint256);
}
