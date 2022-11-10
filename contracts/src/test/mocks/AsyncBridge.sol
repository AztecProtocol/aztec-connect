// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IDefiBridge} from "core/interfaces/IDefiBridge.sol";
import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";
import {IRollupProcessor} from "rollup-encoder/interfaces/IRollupProcessor.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract AsyncBridge is IDefiBridge {
    error MockRevert();

    struct SubAction {
        address target;
        uint256 value;
        bytes data;
    }

    struct Action {
        uint256 outputA;
        uint256 outputB;
        bool interactionComplete;
        SubAction[] subs;
    }

    uint256 public outputValueAReturnedFromConvert;
    uint256 public outputValueBReturnedFromConvert;
    Action public action;

    receive() external payable {}

    constructor() {}

    function mockRevert() public pure {
        revert MockRevert();
    }

    function setAction(Action memory _action) external {
        // Cannot directly copy the SubAction array to storage, so we do it manually
        action.outputA = _action.outputA;
        action.outputB = _action.outputB;
        action.interactionComplete = _action.interactionComplete;

        if (action.subs.length > 0) {
            // Action was set before - delete its subactions
            delete action.subs;
        }

        for (uint256 i = 0; i < _action.subs.length; i++) {
            action.subs.push(_action.subs[i]);
        }
    }

    // @dev Used to simulate a faulty bridge which returns `isAsync = true` and non-zero output values from
    //      convert(...)
    function setOutputValuesReturnedFromConvert(uint256 _outputValueA, uint256 _outputValueB) external {
        outputValueAReturnedFromConvert = _outputValueA;
        outputValueBReturnedFromConvert = _outputValueB;
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
    ) external payable override returns (uint256, uint256, bool) {
        return (outputValueAReturnedFromConvert, outputValueBReturnedFromConvert, true);
    }

    function finalise(
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        AztecTypes.AztecAsset memory,
        uint256,
        uint64
    ) external payable override returns (uint256, uint256, bool) {
        for (uint256 i = 0; i < action.subs.length; i++) {
            SubAction memory sub = action.subs[i];
            (bool success,) = sub.target.call{value: sub.value}(sub.data);

            assembly {
                if iszero(success) {
                    returndatacopy(0, 0, returndatasize())
                    revert(0, returndatasize())
                }
            }
        }
        return (action.outputA, action.outputB, action.interactionComplete);
    }
}
