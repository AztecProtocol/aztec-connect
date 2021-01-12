// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';

contract AztecFeeDistributor is IFeeDistributor, Ownable {
    using SafeMath for uint256;

    event FeeReceived(address sender, uint256 amount);
    event FeeReimbursed(address receiver, uint256 amount);

    address public rollupProcessor;

    constructor(address _rollupProcessor) public {
        rollupProcessor = _rollupProcessor;
    }

    receive() external payable {
        emit FeeReceived(msg.sender, msg.value);
    }

    function txFeeBalance() public view override returns (uint256) {
        return address(this).balance;
    }

    function canPayFeeAmount(uint256 amount) public override returns (bool) {
        return txFeeBalance() >= amount;
    }

    function deposit(uint256 amount) external payable override returns (uint256 depositedAmount) {
        // callable by anyone, adds eth to the contract
        // checks to see if any ERC20 balances can be converted to ETH on Uniswap
        // convertERC20s()
        require(amount == msg.value, 'Fee Distributor: INSUFFICIENT_VALUE');
        depositedAmount = amount;

        emit FeeReceived(msg.sender, amount);
    }

    function reimburseGas(
        uint256 gasUsed,
        uint256 feeLimit,
        address payable feeReceiver
    ) external override returns (uint256 reimbursement) {
        require(msg.sender == rollupProcessor, 'Fee Distributor: INVALID_CALLER');

        reimbursement = gasUsed.mul(tx.gasprice);
        require(reimbursement <= feeLimit, 'Fee Distributor: FEE_LIMIT_EXCEEDED');

        (bool success, ) = feeReceiver.call{value: reimbursement}('');
        require(success, 'Fee Distributor: REIMBURSE_GAS_FAILED');

        emit FeeReimbursed(feeReceiver, reimbursement);
    }
}
