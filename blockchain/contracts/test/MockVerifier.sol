// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import {IVerifier} from '../interfaces/IVerifier.sol';

/**
 * @title Plonk proof verification contract
 * @dev Warning: do not deploy in real environments, for testing only
 * Mocks the role of a PLONK verifier contract
 */
contract MockVerifier is IVerifier {
    /**
     * @dev Mock verify a Plonk proof
     * @param serialized_proof - array of serialized proof data
     */
    function verify(bytes memory serialized_proof, uint256 rollup_size) external override returns (bool) {
        uint256 rollupSize;
        assembly {
            rollupSize := mload(add(serialized_proof, 0x40))
        }
        require(rollupSize == rollup_size, 'Verifier: Wrong rollup size.');
        return true;
    }
}
