// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IFeeDistributor} from '../interfaces/IFeeDistributor.sol';
import {RollupProcessor} from '../RollupProcessor.sol';

/**
 * @title Claim fees from distributor contract
 * @dev Warning: do not deploy in real environments, for testing only
 * Extend a rollup processor contract and allow calling reimburseGas directly.
 */
contract FeeClaimer is RollupProcessor {
    constructor(
        address _verifierAddress,
        uint256 _escapeBlockLowerBound,
        uint256 _escapeBlockUpperBound,
        address _defiBridgeProxy,
        address _weth,
        address _contractOwner
    )
        public
        RollupProcessor(
            _verifierAddress,
            _escapeBlockLowerBound,
            _escapeBlockUpperBound,
            _defiBridgeProxy,
            _weth,
            _contractOwner
        )
    {}

    function claimFee(
        uint256 amount,
        uint256 feeLimit,
        address payable feeReceiver
    ) public {
        IFeeDistributor(feeDistributor).reimburseGas(amount, feeLimit, feeReceiver);
    }
}
