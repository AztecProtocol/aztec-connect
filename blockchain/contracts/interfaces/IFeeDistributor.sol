// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

interface IFeeDistributor {
    event FeeReceived(address sender, uint256 amount);
    event FeeReimbursed(address receiver, uint256 amount);

    function txFeeBalance() external view returns (uint256);

    function canPayFeeAmount(uint256 amount) external returns (bool);

    function deposit(uint256 amount) external payable returns (uint256 depositedAmount);

    function reimburseGas(
        uint256 gasUsed,
        uint256 feeLimit,
        address payable feeReceiver
    ) external returns (uint256 reimbursement);
}
