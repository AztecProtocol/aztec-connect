// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';

import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import {IUniswapV2Pair} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {IWETH} from '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';
import {UniswapV2Library} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';

import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';
import {IRollupProcessor} from './interfaces/IRollupProcessor.sol';

contract AztecFeeDistributor is IFeeDistributor, Ownable {
    using SafeMath for uint256;

    uint256 constant ethAssetId = 0;

    uint256 public override reimburseConstant = 16 * 51781;
    uint256 public override convertConstant = 157768 * 20; // gas for calling convert() / 5%
    address public immutable override rollupProcessor;
    address public immutable override router;
    address public immutable override factory;
    address public immutable override WETH;

    constructor(address _rollupProcessor, address _router) public {
        rollupProcessor = _rollupProcessor;
        router = _router;
        factory = IUniswapV2Router02(_router).factory();
        WETH = IUniswapV2Router02(_router).WETH();
    }

    receive() external payable {}

    function setReimburseConstant(uint256 _reimburseConstant) external override onlyOwner {
        reimburseConstant = _reimburseConstant;
    }

    function setConvertConstant(uint256 _convertConstant) external override onlyOwner {
        convertConstant = _convertConstant;
    }

    function txFeeBalance(uint256 assetId) public view override returns (uint256) {
        if (assetId == ethAssetId) {
            return address(this).balance;
        } else {
            address assetAddress = IRollupProcessor(rollupProcessor).getSupportedAsset(assetId);
            return IERC20(assetAddress).balanceOf(address(this));
        }
    }

    function deposit(uint256 assetId, uint256 amount) external payable override returns (uint256 depositedAmount) {
        if (assetId == ethAssetId) {
            require(amount == msg.value, 'Fee Distributor: WRONG_AMOUNT');
        } else {
            require(msg.value == 0, 'Fee Distributor: WRONG_PAYMENT_TYPE');

            address assetAddress = IRollupProcessor(rollupProcessor).getSupportedAsset(assetId);
            IERC20(assetAddress).transferFrom(msg.sender, address(this), amount);

            uint256 balance = IERC20(assetAddress).balanceOf(address(this));
            uint256 outputValue = getAmountOut(assetAddress, balance);
            if (outputValue >= convertConstant.mul(tx.gasprice)) {
                swapTokensForETH(assetAddress, balance, outputValue);

                emit Convert(assetId, balance, outputValue);
            }
        }

        depositedAmount = amount;
    }

    function reimburseGas(
        uint256 gasUsed,
        uint256 feeLimit,
        address payable feeReceiver
    ) external override returns (uint256 reimbursement) {
        require(msg.sender == rollupProcessor, 'Fee Distributor: INVALID_CALLER');

        reimbursement = gasUsed.add(reimburseConstant).mul(tx.gasprice);
        require(reimbursement <= feeLimit, 'Fee Distributor: FEE_LIMIT_EXCEEDED');

        (bool success, ) = feeReceiver.call{value: reimbursement}('');
        require(success, 'Fee Distributor: REIMBURSE_GAS_FAILED');

        emit FeeReimbursed(feeReceiver, reimbursement);
    }

    function convert(uint256 assetId, uint256 minOutputValue) public override onlyOwner returns (uint256 outputValue) {
        require(assetId != ethAssetId, 'Fee Distributor: NOT_A_TOKEN_ASSET');

        address assetAddress = IRollupProcessor(rollupProcessor).getSupportedAsset(assetId);
        uint256 inputValue = IERC20(assetAddress).balanceOf(address(this));
        require(inputValue > 0, 'Fee Distributor: EMPTY_BALANCE');

        outputValue = getAmountOut(assetAddress, inputValue);
        require(outputValue >= minOutputValue, 'Fee Distributor: INSUFFICIENT_OUTPUT_AMOUNT');

        swapTokensForETH(assetAddress, inputValue, outputValue);

        emit Convert(assetId, inputValue, outputValue);
    }

    function getAmountOut(address assetAddress, uint256 inputValue) internal view returns (uint256 outputValue) {
        (uint256 reserveIn, uint256 reserveOut) = UniswapV2Library.getReserves(factory, assetAddress, WETH);
        outputValue = UniswapV2Library.getAmountOut(inputValue, reserveIn, reserveOut);
    }

    function swapTokensForETH(
        address assetAddress,
        uint256 inputValue,
        uint256 outputValue
    ) internal {
        address pair = UniswapV2Library.pairFor(factory, assetAddress, WETH);
        (bool success, ) = assetAddress.call(abi.encodeWithSelector(0xa9059cbb, pair, inputValue));
        require(success, 'Fee Distributor: TRANSFER_FAILED');

        (uint256 amountOut0, uint256 amountOut1) =
            assetAddress < WETH ? (uint256(0), outputValue) : (outputValue, uint256(0));
        IUniswapV2Pair(pair).swap(amountOut0, amountOut1, address(this), new bytes(0));

        IWETH(WETH).withdraw(outputValue);
    }
}
