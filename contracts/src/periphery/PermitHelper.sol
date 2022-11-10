// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC20Permit} from "core/interfaces/IERC20Permit.sol";
import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";

/**
 * @notice Helper contract for permit actions
 * @dev Contains the permit functions to minimize bloat in core.
 */
contract PermitHelper is Ownable {
    using SafeERC20 for IERC20Permit;

    IRollupProcessor public immutable ROLLUP_PROCESSOR;

    constructor(IRollupProcessor _rollupProcessor) {
        ROLLUP_PROCESSOR = _rollupProcessor;
    }

    /**
     * @notice Kills the contract, useful if moving away from the specific rollup
     */
    function kill() external onlyOwner {
        selfdestruct(payable(msg.sender));
    }

    /**
     * @notice Preapprove the ROLLUP_PROCESSOR to spend `_asset`
     * @param _asset The address of the asset to pre-approve
     */
    function preApprove(address _asset) external {
        IERC20Permit(_asset).safeApprove(address(ROLLUP_PROCESSOR), 0);
        IERC20Permit(_asset).safeApprove(address(ROLLUP_PROCESSOR), type(uint256).max);
    }

    /**
     * @notice Deposit funds as part of the first stage of the two stage deposit. Permit flow
     * @param _assetId - unique ID of the asset
     * @param _amount - number of tokens being deposited
     * @param _owner - address that can spend the deposited funds
     * @param _deadline - when the permit signature expires
     * @param _v - ECDSA sig param
     * @param _r - ECDSA sig param
     * @param _s - ECDSA sig param
     */
    function depositPendingFundsPermit(
        uint256 _assetId,
        uint256 _amount,
        address _owner,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        address assetAddress = ROLLUP_PROCESSOR.getSupportedAsset(_assetId);
        IERC20Permit token = IERC20Permit(assetAddress);
        token.permit(msg.sender, address(this), _amount, _deadline, _v, _r, _s);
        token.safeTransferFrom(msg.sender, address(this), _amount);
        ROLLUP_PROCESSOR.depositPendingFunds(_assetId, _amount, _owner, bytes32(0));
    }

    /**
     * @notice Deposit funds as part of the first stage of the two stage deposit. Permit flow
     * @param _assetId - unique ID of the asset
     * @param _amount - number of tokens being deposited
     * @param _owner - address that can spend the deposited funds
     * @param _nonce - user's nonce on the erc20 contract, for replay protection
     * @param _deadline - when the permit signature expires
     * @param _v - ECDSA sig param
     * @param _r - ECDSA sig param
     * @param _s - ECDSA sig param
     */
    function depositPendingFundsPermitNonStandard(
        uint256 _assetId,
        uint256 _amount,
        address _owner,
        uint256 _nonce,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        address assetAddress = ROLLUP_PROCESSOR.getSupportedAsset(_assetId);
        IERC20Permit token = IERC20Permit(assetAddress);
        token.permit(msg.sender, address(this), _nonce, _deadline, true, _v, _r, _s);
        token.safeTransferFrom(msg.sender, address(this), _amount);
        ROLLUP_PROCESSOR.depositPendingFunds(_assetId, _amount, _owner, bytes32(0));
    }
}
