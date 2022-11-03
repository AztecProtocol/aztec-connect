// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

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

    function convert(address assetAddress, uint256 minOutputValue) external returns (uint256 outputValue);
}
