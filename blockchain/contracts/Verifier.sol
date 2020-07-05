// SPDX-License-Identifier: GPL-2.0-only

pragma solidity >=0.6.10 <0.7.0;

import {IVerifier} from './interfaces/IVerifier.sol';

contract Verifier is IVerifier {
    function verify(bytes calldata proofData) external override returns (bool) {
        return true;
    }
}
