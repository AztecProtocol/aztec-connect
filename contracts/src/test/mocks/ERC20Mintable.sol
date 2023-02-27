// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract where anybody is able to mint
 */
contract ERC20Mintable is ERC20 {
    uint8 private assetDecimals = 18;

    constructor(string memory _symbol) ERC20(_symbol, _symbol) {}

    function setDecimals(uint8 _decimals) external {
        assetDecimals = _decimals;
    }

    function mint(address _to, uint256 _value) public returns (bool) {
        _mint(_to, _value);
        return true;
    }

    function decimals() public view override(ERC20) returns (uint8) {
        return assetDecimals;
    }

    function _spendAllowance(address _owner, address _spender, uint256 _amount) internal override(ERC20) {
        uint256 currentAllowance = allowance(_owner, _spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= _amount, string(abi.encodePacked(symbol(), ": insufficient allowance")));
            unchecked {
                _approve(_owner, _spender, currentAllowance - _amount);
            }
        }
    }
}
