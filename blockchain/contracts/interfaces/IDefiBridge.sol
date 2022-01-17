// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;
pragma experimental ABIEncoderV2;

import {AztecTypes} from '../AztecTypes.sol';
interface IDefiBridge {
    function convert(
        AztecTypes.AztecAsset memory inputAssetA,
        AztecTypes.AztecAsset memory inputAssetB,
        AztecTypes.AztecAsset memory outputAssetA,
        AztecTypes.AztecAsset memory outputAssetB,
        uint256 totalInputValue,
        uint256 interactionNonce,
        uint64 auxData
    )
        external
        payable
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool isAsync
        );

    function canFinalise(uint256 interactionNonce) external view returns (bool);

    function finalise(
        address inputAsset,
        address outputAssetA,
        address outputAssetB,
        uint256 interactionNonce,
        uint32 bitConfig
    ) external payable;
}
