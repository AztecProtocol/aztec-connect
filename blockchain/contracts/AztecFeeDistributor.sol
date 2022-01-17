// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/utils/math/SafeMath.sol';

import {IUniswapV2Router02} from '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import {IUniswapV2Pair} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {IWETH} from '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';


/**
 * @title UniswapV2LibraryErrata
 * @dev Methods from UniswapV2Library that we need. Re-implemented due to the original from @uniswap failing to compile w. Solidity >=0.8.0
 */
library UniswapV2LibraryErrata {
    using SafeMath for uint;

    // returns sorted token addresses, used to handle return values from pairs sorted in this order
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address factory, address tokenA, address tokenB) internal pure returns (address pair) {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        uint pairUint = uint(keccak256(abi.encodePacked(
                hex'ff',
                factory,
                keccak256(abi.encodePacked(token0, token1)),
                hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash
            )));
        assembly {
            pair := and(pairUint, 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }

    // fetches and sorts the reserves for a pair
    function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2Pair(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) internal pure returns (uint amountOut) {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }
}

import {IFeeDistributor} from './interfaces/IFeeDistributor.sol';

contract AztecFeeDistributor is IFeeDistributor, Ownable {
    using SafeMath for uint256;

    uint256 public override feeLimit = 4e17;
    address public override aztecFeeClaimer;
    address public rollupProcessor;

    uint256 public override convertConstant = 157768 * 20; // gas for calling convert() / 5%

    address public immutable override router;
    address public immutable override factory;
    address public immutable override WETH;

    constructor(
        address _feeClaimer,
        address _rollupProcessor,
        address _router
    ) public {
        aztecFeeClaimer = _feeClaimer;
        rollupProcessor = _rollupProcessor;
        router = _router;
        factory = IUniswapV2Router02(_router).factory();
        WETH = IUniswapV2Router02(_router).WETH();
    }

    // @dev top up the designated address by feeLimit
    receive() external payable {
        if (msg.sender == rollupProcessor) {
            if (aztecFeeClaimer.balance < feeLimit) {
                uint256 toSend = address(this).balance > feeLimit ? feeLimit : address(this).balance;
                (bool success, ) = aztecFeeClaimer.call{gas: 3000, value: toSend}('');
                emit FeeReimbursed(aztecFeeClaimer, toSend);
            }
        }
    }

    function setFeeLimit(uint256 _feeLimit) external override onlyOwner {
        feeLimit = _feeLimit;
    }

    function setConvertConstant(uint256 _convertConstant) external override onlyOwner {
        convertConstant = _convertConstant;
    }

    function setFeeClaimer(address _feeClaimer) external override onlyOwner {
        aztecFeeClaimer = _feeClaimer;
    }

    function txFeeBalance(address assetAddress) public view override returns (uint256) {
        if (assetAddress == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(assetAddress).balanceOf(address(this));
        }
    }

    function deposit(address assetAddress, uint256 amount) external payable override returns (uint256 depositedAmount) {
        if (assetAddress == address(0)) {
            require(amount == msg.value, 'Fee Distributor: WRONG_AMOUNT');
        } else {
            require(msg.value == 0, 'Fee Distributor: WRONG_PAYMENT_TYPE');

            IERC20(assetAddress).transferFrom(msg.sender, address(this), amount);

            uint256 balance = IERC20(assetAddress).balanceOf(address(this));
            uint256 outputValue = getAmountOut(assetAddress, balance);
            if (outputValue >= convertConstant.mul(tx.gasprice)) {
                swapTokensForETH(assetAddress, balance, outputValue);

                emit Convert(assetAddress, balance, outputValue);
            }
        }

        depositedAmount = amount;
    }

    function convert(address assetAddress, uint256 minOutputValue) public override returns (uint256 outputValue) {
        require(assetAddress != address(0), 'Fee Distributor: NOT_A_TOKEN_ASSET');

        uint256 inputValue = IERC20(assetAddress).balanceOf(address(this));
        require(inputValue > 0, 'Fee Distributor: EMPTY_BALANCE');

        outputValue = getAmountOut(assetAddress, inputValue);
        require(outputValue >= minOutputValue, 'Fee Distributor: INSUFFICIENT_OUTPUT_AMOUNT');

        swapTokensForETH(assetAddress, inputValue, outputValue);

        emit Convert(assetAddress, inputValue, outputValue);
    }

    function getAmountOut(address assetAddress, uint256 inputValue) internal view returns (uint256 outputValue) {
        (uint256 reserveIn, uint256 reserveOut) = UniswapV2LibraryErrata.getReserves(factory, assetAddress, WETH);
        outputValue = UniswapV2LibraryErrata.getAmountOut(inputValue, reserveIn, reserveOut);
    }

    function swapTokensForETH(
        address assetAddress,
        uint256 inputValue,
        uint256 outputValue
    ) internal {
        address pair = UniswapV2LibraryErrata.pairFor(factory, assetAddress, WETH);
        (bool success, ) = assetAddress.call(abi.encodeWithSelector(0xa9059cbb, pair, inputValue));
        require(success, 'Fee Distributor: TRANSFER_FAILED');

        (uint256 amountOut0, uint256 amountOut1) = assetAddress < WETH
            ? (uint256(0), outputValue)
            : (outputValue, uint256(0));
        IUniswapV2Pair(pair).swap(amountOut0, amountOut1, address(this), new bytes(0));

        IWETH(WETH).withdraw(outputValue);
    }
}
