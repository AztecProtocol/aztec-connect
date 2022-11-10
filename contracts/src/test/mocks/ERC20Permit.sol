// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {ERC20Mintable} from "mocks/ERC20Mintable.sol";

/**
 * @dev Warning: do not deploy in real environments, for testing only
 * ERC20 contract which has permit implementation and is mintable
 */
contract ERC20Permit is ERC20Mintable {
    bytes32 public DOMAIN_SEPARATOR;
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    mapping(address => uint256) public nonces;

    // bytes32 public constant PERMIT_TYPEHASH_NON_STANDARD = keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)");
    bytes32 public constant PERMIT_TYPEHASH_NON_STANDARD =
        0xea2aa0a1be11a07ed86d755c93467f4f82362b452371d1ba94d1715123511acb;

    constructor(string memory _symbol) ERC20Mintable(_symbol) {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name())),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function permit(
        address _owner,
        address _spender,
        uint256 _value,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        require(_deadline >= block.timestamp, "EXPIRED");
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, _owner, _spender, _value, nonces[_owner]++, _deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, _v, _r, _s);
        require(recoveredAddress != address(0) && recoveredAddress == _owner, "INVALID_SIGNATURE");
        _approve(_owner, _spender, _value);
    }

    function permit(
        address _holder,
        address _spender,
        uint256 _nonce,
        uint256 _expiry,
        bool _allowed,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external {
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH_NON_STANDARD, _holder, _spender, _nonce, _expiry, _allowed))
            )
        );

        require(_holder != address(0), "INVALID_HOLDER");
        require(_holder == ecrecover(digest, _v, _r, _s), "INVALID_SIGNATURE");
        require(_expiry == 0 || _expiry >= block.timestamp, "EXPIRED");
        require(_nonce == nonces[_holder]++, "INVALID_NONCE");
        uint256 value = _allowed ? (2 ** 256) - 1 : 0;
        _approve(_holder, _spender, value);
    }
}
