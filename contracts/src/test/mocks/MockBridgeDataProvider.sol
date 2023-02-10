// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AztecTypes} from "rollup-encoder/libraries/AztecTypes.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 */
contract MockBridgeDataProvider {
    struct BridgeData {
        address bridgeAddress;
        uint256 bridgeAddressId;
        string label;
    }

    mapping(uint256 => BridgeData) bridges;
    mapping(uint256 => uint256) subsidies;

    uint256 private constant MASK_THIRTY_TWO_BITS = 0xffffffff;

    constructor() {}

    function setBridgeData(
        uint256 _bridgeAddressId,
        address _bridgeAddress,
        uint256 _subsidy,
        string memory _description
    ) public {
        bridges[_bridgeAddressId] =
            BridgeData({bridgeAddress: _bridgeAddress, bridgeAddressId: _bridgeAddressId, label: _description});
        subsidies[_bridgeAddressId] = _subsidy;
    }

    function updateSubsidy(uint256 _bridgeAddressId, uint256 _subsidy) public {
        subsidies[_bridgeAddressId] = _subsidy;
    }

    function getAccumulatedSubsidyAmount(uint256 _bridgeCallData) external view returns (uint256, uint256, uint256) {
        uint256 bridgeAddressId = _bridgeCallData & MASK_THIRTY_TWO_BITS;
        uint256 gasSubsidy = subsidies[bridgeAddressId];
        uint256 ethSubsidy = gasSubsidy * block.basefee;
        return (5, ethSubsidy, gasSubsidy);
    }

    function getBridge(uint256 _bridgeAddressId) external view returns (BridgeData memory) {
        return bridges[_bridgeAddressId];
    }
}
