// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <0.7.0;

import {ECDSA} from '@openzeppelin/contracts/cryptography/ECDSA.sol';

library RollupProcessorLibrary {
    /**
     * Perform ECDSA signature validation for a signature over a proof. Relies on the
     * openzeppelin ECDSA cryptography library - this performs checks on `s` and `v`
     * to prevent signature malleability based attacks
     *
     * @param data - Data being signed over.
     * @param signature - ECDSA signature over the secp256k1 elliptic curve.
     * @param signer - Address that signs the signatrue.
     */
    function validateSignature(
        bytes memory data,
        bytes memory signature,
        address signer
    ) internal pure {
        require(signer != address(0x0), 'Validate Signatue: ZERO_ADDRESS');

        bytes32 digest = keccak256(data);
        bytes32 msgHash = ECDSA.toEthSignedMessageHash(digest);

        address recoveredSigner = ECDSA.recover(msgHash, signature);
        require(recoveredSigner == signer, 'Validate Signatue: INVALID_SIGNATRUE');
    }
}
