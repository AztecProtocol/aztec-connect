// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;

interface IFeeDistributor {
    event FeeReimbursed(address receiver, uint256 amount);
    event Convert(address assetAddress, uint256 inputValue, uint256 outputValue);

    function convertConstant() external view returns (uint256);

    function feeLimit() external view returns (uint256);

    function aztecFeeClaimer() external view returns (address);

    function router() external view returns (address);

    function factory() external view returns (address);

    function WETH() external view returns (address);

    function setFeeClaimer(address _feeClaimer) external;

    function setFeeLimit(uint256 _feeLimit) external;

    function setConvertConstant(uint256 _convertConstant) external;

    function txFeeBalance(address assetAddress) external view returns (uint256);

    function deposit(address assetAddress, uint256 amount) external payable returns (uint256 depositedAmount);

    function convert(address assetAddress, uint256 minOutputValue) external returns (uint256 outputValue);
}
