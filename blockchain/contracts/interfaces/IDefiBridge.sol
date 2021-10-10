// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.8.0;

interface IDefiBridge {
    function getInfo()
        external
        view
        returns (
            uint32 numOutputAssets,
            address inputAsset,
            address outputAssetA,
            address outputAssetB
        );

    function convert(uint256 inputValue, uint256 interactionNonce)
        external
        payable
        returns (
            uint256 outputValueA,
            uint256 outputValueB,
            bool
        );

    function canFinalise(uint256 interactionNonce) external view returns (bool);

    function finalise(uint256 interactionNonce) external payable;
}
