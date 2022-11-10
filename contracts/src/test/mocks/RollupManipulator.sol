// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {Test} from "forge-std/Test.sol";

contract RollupManipulator is Test {
    bytes32 private constant ZERO = 0x2d25a1e3a51eb293004c4b56abe12ed0da6bca2b4a21936752a85d102593c1b4;
    uint256 private constant DEFIINTERACTIONHASHES_BIT_OFFSET = 208;
    uint256 private constant ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET = 192;
    uint256 private constant ARRAY_LENGTH_MASK = 0x3ff; // 1023

    function stubTransactionHashesLength(address _rollupProcessor, uint256 _size) public {
        bytes32 state = vm.load(_rollupProcessor, bytes32(uint256(2)));

        assembly {
            let oldState := and(not(shl(DEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
            state := or(oldState, shl(DEFIINTERACTIONHASHES_BIT_OFFSET, _size))
        }
        vm.store(_rollupProcessor, bytes32(uint256(2)), state);

        uint256 slot;
        assembly {
            mstore(0x00, 0x06)
            slot := keccak256(0x00, 0x20)
        }
        for (uint256 i = 0; i < 32; i++) {
            vm.store(_rollupProcessor, bytes32(uint256(slot + (_size - (i + 1)))), ZERO);
        }
    }

    function stubAsyncTransactionHashesLength(address _rollupProcessor, uint256 _size) public {
        bytes32 state = vm.load(_rollupProcessor, bytes32(uint256(2)));

        assembly {
            let oldState := and(not(shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, ARRAY_LENGTH_MASK)), state)
            state := or(oldState, shl(ASYNCDEFIINTERACTIONHASHES_BIT_OFFSET, _size))
        }
        vm.store(_rollupProcessor, bytes32(uint256(2)), state);

        uint256 slot;
        assembly {
            mstore(0x00, 0x05)
            slot := keccak256(0x00, 0x20)
        }
        for (uint256 i = 0; i < 32; i++) {
            vm.store(_rollupProcessor, bytes32(uint256(slot + (_size - (i + 1)))), ZERO);
        }
    }
}
