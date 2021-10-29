// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

interface IDefiBridge {
    function convert(
        address inputAsset,
        address outputAssetA,
        address outputAssetB,
        uint256 inputValue,
        uint256 interactionNonce,
        uint32 openingNonce,
        uint32 bitConfig,
        uint64 auxData
    )
        external
        payable
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool
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
