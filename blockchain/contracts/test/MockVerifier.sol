// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd

pragma solidity >=0.6.0 <0.8.11;
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
     */
    function verify(bytes memory, uint256) external override returns (bool) {
        return true;
    }
}
