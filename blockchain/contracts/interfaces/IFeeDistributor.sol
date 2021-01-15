// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

interface IFeeDistributor {
    event FeeReimbursed(address receiver, uint256 amount);

    function txFeeBalance(uint256 assetId) external view returns (uint256);

    function deposit(uint256 assetId, uint256 amount) external payable returns (uint256 depositedAmount);

    function reimburseGas(
        uint256 gasUsed,
        uint256 feeLimit,
        address payable feeReceiver
    ) external returns (uint256 reimbursement);
}
