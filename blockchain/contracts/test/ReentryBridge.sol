// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IDefiBridge} from '../interfaces/IDefiBridge.sol';
import {AztecTypes} from '../AztecTypes.sol';
import {IRollupProcessor} from '../interfaces/IRollupProcessor.sol';

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract ReentryBridge is IDefiBridge {
    /*----------------------------------------
      ERROR TAGS
      ----------------------------------------*/
    error PAUSED();
    error NOT_PAUSED();
    error LOCKED_NO_REENTER();
    error INVALID_PROVIDER();
    error THIRD_PARTY_CONTRACTS_FLAG_NOT_SET();
    error INSUFFICIENT_DEPOSIT();
    error INVALID_ASSET_ID();
    error INVALID_ASSET_ADDRESS();
    error INVALID_LINKED_TOKEN_ADDRESS();
    error INVALID_LINKED_BRIDGE_ADDRESS();
    error INVALID_BRIDGE_ID();
    error INVALID_BRIDGE_ADDRESS();
    error BRIDGE_ID_IS_INCONSISTENT();
    error BRIDGE_WITH_IDENTICAL_INPUT_ASSETS(uint256 inputAssetId);
    error BRIDGE_WITH_IDENTICAL_OUTPUT_ASSETS(uint256 outputAssetId);
    error ZERO_TOTAL_INPUT_VALUE();
    error ARRAY_OVERFLOW();
    error MSG_VALUE_WRONG_AMOUNT();
    error INSUFFICIENT_ETH_PAYMENT();
    error WITHDRAW_TO_ZERO_ADDRESS();
    error DEPOSIT_TOKENS_WRONG_PAYMENT_TYPE();
    error INSUFFICIENT_TOKEN_APPROVAL();
    error NONZERO_OUTPUT_VALUE_ON_NOT_USED_ASSET(uint256 outputValue);
    error INCORRECT_STATE_HASH(bytes32 oldStateHash, bytes32 newStateHash);
    error INCORRECT_DATA_START_INDEX(uint256 providedIndex, uint256 expectedIndex);
    error INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH(
        bytes32 providedDefiInteractionHash,
        bytes32 expectedDefiInteractionHash
    );
    error PUBLIC_INPUTS_HASH_VERIFICATION_FAILED(uint256, uint256);
    error PROOF_VERIFICATION_FAILED();

    address public immutable rollupProcessor;

    struct Action {
        uint256 id;
        uint256 nonce;
        bool noOp;
        bool canFinalise;
        bool isAsync;
        bytes nextAction;
        uint256 a;
        uint256 b;
    }

    mapping(uint256 => bool) public executed;
    uint256 idCount;
    Action[] public actions;

    bool public died;

    uint256 public lastNonce;

    receive() external payable {}

    constructor(address _rollupProcessor) {
        rollupProcessor = _rollupProcessor;
    }

    function addAction(
        uint256 _nonce,
        bool _isAsync,
        bool _canFinalise,
        bool _noOp,
        bytes memory _nextAction,
        uint256 _a,
        uint256 _b
    ) external {
        Action memory action = Action({
            id: idCount++,
            nonce: _nonce,
            isAsync: _isAsync,
            canFinalise: _canFinalise,
            noOp: _noOp,
            nextAction: _nextAction,
            a: _a,
            b: _b
        });
        actions.push(action);
    }

    function convert(
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        uint256,
        uint256,
        uint64,
        address
    )
        external
        payable
        override
        returns (
            uint256,
            uint256,
            bool
        )
    {
        Action memory action = actions[actions.length - 1];
        bool isAsync = action.isAsync;

        if (isAsync) {
            return (0, 0, isAsync);
        }

        execute();
        return (action.a, action.b, isAsync);
    }

    function canFinalise(uint256) external view override returns (bool) {
        return actions[actions.length - 1].canFinalise;
    }

    function finalise(
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        uint256,
        uint64
    )
        external
        payable
        override
        returns (
            uint256,
            uint256,
            bool
        )
    {
        require(msg.sender == rollupProcessor, 'invalid sender!');

        (uint256 a, uint256 b) = execute();

        return (a, b, true);
    }

    function execute() internal returns (uint256, uint256) {
        Action memory action = actions[actions.length - 1];
        executed[action.id] = true;
        actions.pop();

        lastNonce = action.nonce;
        IRollupProcessor(rollupProcessor).receiveEthFromBridge{value: 1}(action.nonce);

        if (!action.noOp) {
            (bool success, ) = rollupProcessor.call(action.nextAction);
            assembly {
                if iszero(success) {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
            }
            if (!success) {
                died = true;
            }
        }

        return (action.a, action.b);
    }
}
