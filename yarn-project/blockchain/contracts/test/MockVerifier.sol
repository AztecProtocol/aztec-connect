// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

import {IVerifier} from '../interfaces/IVerifier.sol';

/**
 * @title Plonk proof verification contract
 * @dev Warning: do not deploy in real environments, for testing only
 * Mocks the role of a PLONK verifier contract
 */
contract MockVerifier is IVerifier {
    /**
     * @dev Mock verify a Plonk proof
     */
    function verify(bytes memory, uint256) external pure override returns (bool) {
        return true;
    }
}
