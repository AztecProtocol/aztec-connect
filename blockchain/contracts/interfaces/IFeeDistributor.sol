// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

interface IFeeDistributor {
    event FeeReimbursed(address receiver, uint256 amount);
    event Convert(uint256 assetId, uint256 inputValue, uint256 outputValue);

    function reimburseConstant() external pure returns (uint256);

    function convertConstant() external pure returns (uint256);

    function rollupProcessor() external pure returns (address);

    function router() external pure returns (address);

    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function setReimburseConstant(uint256 _reimburseConstant) external;

    function setConvertConstant(uint256 _convertConstant) external;

    function txFeeBalance(uint256 assetId) external view returns (uint256);

    function deposit(uint256 assetId, uint256 amount) external payable returns (uint256 depositedAmount);

    function reimburseGas(
        uint256 gasUsed,
        uint256 feeLimit,
        address payable feeReceiver
    ) external returns (uint256 reimbursement);

    function convert(uint256 assetId, uint256 minOutputValue) external returns (uint256 outputValue);
}
