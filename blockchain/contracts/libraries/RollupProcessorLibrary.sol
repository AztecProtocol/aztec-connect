// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.8.4 <0.8.11;

library RollupProcessorLibrary {
    /**
     * Extracts the address of the signer with ECDSA. Performs checks on `s` and `v` to
     * to prevent signature malleability based attacks
     * @param digest - Hashed data being signed over.
     * @param signature - ECDSA signature over the secp256k1 elliptic curve.
     * @param signer - Address that signs the signature.
     */
    function validateSignature(
        bytes32 digest,
        bytes memory signature,
        address signer
    ) internal view {
        bool result;
        address recoveredSigner = address(0x0);
        require(signer != address(0x0), 'validateSignature: ZERO_ADDRESS');

        // prepend "\x19Ethereum Signed Message:\n32" to the digest to create the signed message
        bytes32 message;
        assembly {
            mstore(0, '\x19Ethereum Signed Message:\n32')
            mstore(add(0, 28), digest)
            message := keccak256(0, 60)
        }
        assembly {
            let mPtr := mload(0x40)
            let byteLength := mload(signature)

            // store the signature digest
            mstore(mPtr, message)

            // load 'v' - we need it for a condition check
            // add 0x60 to jump over 3 words - length of bytes array, r and s
            let v := shr(248, mload(add(signature, 0x60))) // bitshifting, to resemble padLeft
            let s := mload(add(signature, 0x40))

            /**
             * Original memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     r
             * signature + 0x40 : signature + 0x60     s
             * signature + 0x60 : signature + 0x80     v
             * Desired memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     v
             * signature + 0x40 : signature + 0x60     r
             * signature + 0x60 : signature + 0x80     s
             */

            // store s
            mstore(add(mPtr, 0x60), s)
            // store r
            mstore(add(mPtr, 0x40), mload(add(signature, 0x20)))
            // store v
            mstore(add(mPtr, 0x20), v)
            result := and(
                and(
                    // validate s is in lower half order
                    lt(s, 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1),
                    and(
                        // validate signature length == 0x41
                        eq(byteLength, 0x41),
                        // validate v == 27 or v == 28
                        or(eq(v, 27), eq(v, 28))
                    )
                ),
                // validate call to ecrecover precompile succeeds
                staticcall(gas(), 0x01, mPtr, 0x80, mPtr, 0x20)
            )

            // save the recoveredSigner only if the first word in signature is not `message` anymore
            switch eq(message, mload(mPtr))
                case 0 {
                    recoveredSigner := mload(mPtr)
                }
            mstore(mPtr, byteLength) // and put the byte length back where it belongs

            // validate that recoveredSigner is not address(0x00)
            result := and(result, not(iszero(recoveredSigner)))
        }

        require(result, 'validateSignature: signature recovery failed');
        require(recoveredSigner == signer, 'validateSignature: INVALID_SIGNATURE');
    }

    /**
     * Extracts the address of the signer with ECDSA. Performs checks on `s` and `v` to
     * to prevent signature malleability based attacks
     * This 'Unpacked' version expects 'signature' to be a 92-byte array.
     * i.e. the `v` parameter occupies a full 32 bytes of memory, not 1 byte
     * @param hashedMessage - Hashed data being signed over. This function only works if the message has been pre formated to EIP https://eips.ethereum.org/EIPS/eip-191
     * @param signature - ECDSA signature over the secp256k1 elliptic curve.
     * @param signer - Address that signs the signature.
     */
    function validateSheildSignatureUnpacked(
        bytes32 hashedMessage,
        bytes memory signature,
        address signer
    ) internal view {
        bool result;
        address recoveredSigner = address(0x0);
        require(signer != address(0x0), 'validateSignature: ZERO_ADDRESS');

        assembly {
            let mPtr := mload(0x40)
            // There's a little trick we can pull. We expect `signature` to be a byte array, of length 0x60, with
            // 'v', 'r' and 's' located linearly in memory. Preceeding this is the length parameter of `signature`.
            // We *replace* the length param with the signature msg to get a memory block formatted for the precompile
            // load length as a temporary variable
            // N.B. we mutate the signature by re-ordering r, s, and v!
            let byteLength := mload(signature)

            // store the signature digest
            mstore(signature, hashedMessage)

            // load 'v' - we need it for a condition check
            // add 0x60 to jump over 3 words - length of bytes array, r and s
            let v := mload(add(signature, 0x60))
            let s := mload(add(signature, 0x40))

            /**
             * Original memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     r
             * signature + 0x40 : signature + 0x60     s
             * signature + 0x60 : signature + 0x80     v
             * Desired memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     v
             * signature + 0x40 : signature + 0x60     r
             * signature + 0x60 : signature + 0x80     s
             */

            // move s to v position
            mstore(add(signature, 0x60), s)
            // move r to s position
            mstore(add(signature, 0x40), mload(add(signature, 0x20)))
            // move v to r position
            mstore(add(signature, 0x20), v)
            result := and(
                and(
                    // validate s is in lower half order
                    lt(s, 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1),
                    and(
                        // validate signature length == 0x60 (unpacked)
                        eq(byteLength, 0x60),
                        // validate v == 27 or v == 28
                        or(eq(v, 27), eq(v, 28))
                    )
                ),
                // validate call to ecrecover precompile succeeds
                staticcall(gas(), 0x01, signature, 0x80, signature, 0x20)
            )

            // save the recoveredSigner only if the first word in signature is not `message` anymore
            switch eq(hashedMessage, mload(signature))
                case 0 {
                    recoveredSigner := mload(signature)
                }
            mstore(signature, byteLength) // and put the byte length back where it belongs

            // validate that recoveredSigner is not address(0x00)
            result := and(result, not(iszero(recoveredSigner)))
        }

        require(result, 'validateUnpackedSignature: signature recovery failed');
        require(recoveredSigner == signer, 'validateUnpackedSignature: INVALID_SIGNATURE');
    }

     /**
     * Extracts the address of the signer with ECDSA. Performs checks on `s` and `v` to
     * to prevent signature malleability based attacks
     * This 'Unpacked' version expects 'signature' to be a 92-byte array.
     * i.e. the `v` parameter occupies a full 32 bytes of memory, not 1 byte
     * @param digest - Hashed data being signed over.
     * @param signature - ECDSA signature over the secp256k1 elliptic curve.
     * @param signer - Address that signs the signature.
     */
    function validateUnpackedSignature(
        bytes32 digest,
        bytes memory signature,
        address signer
    ) internal view {
        bool result;
        address recoveredSigner = address(0x0);
        require(signer != address(0x0), 'validateSignature: ZERO_ADDRESS');

        // prepend "\x19Ethereum Signed Message:\n32" to the digest to create the signed message
        bytes32 message;
        assembly {
            mstore(0, '\x19Ethereum Signed Message:\n32')
            mstore(28, digest)
            message := keccak256(0, 60)
        }
        assembly {
            // There's a little trick we can pull. We expect `signature` to be a byte array, of length 0x60, with
            // 'v', 'r' and 's' located linearly in memory. Preceeding this is the length parameter of `signature`.
            // We *replace* the length param with the signature msg to get a memory block formatted for the precompile
            // load length as a temporary variable
            // N.B. we mutate the signature by re-ordering r, s, and v!
            let byteLength := mload(signature)

            // store the signature digest
            mstore(signature, message)

            // load 'v' - we need it for a condition check
            // add 0x60 to jump over 3 words - length of bytes array, r and s
            let v := mload(add(signature, 0x60))
            let s := mload(add(signature, 0x40))

            /**
             * Original memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     r
             * signature + 0x40 : signature + 0x60     s
             * signature + 0x60 : signature + 0x80     v
             * Desired memory map for input to precompile
             *
             * signature : signature + 0x20            message
             * signature + 0x20 : signature + 0x40     v
             * signature + 0x40 : signature + 0x60     r
             * signature + 0x60 : signature + 0x80     s
             */

            // move s to v position
            mstore(add(signature, 0x60), s)
            // move r to s position
            mstore(add(signature, 0x40), mload(add(signature, 0x20)))
            // move v to r position
            mstore(add(signature, 0x20), v)
            result := and(
                and(
                    // validate s is in lower half order
                    lt(s, 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A1),
                    and(
                        // validate signature length == 0x60 (unpacked)
                        eq(byteLength, 0x60),
                        // validate v == 27 or v == 28
                        or(eq(v, 27), eq(v, 28))
                    )
                ),
                // validate call to ecrecover precompile succeeds
                staticcall(gas(), 0x01, signature, 0x80, signature, 0x20)
            )

            // save the recoveredSigner only if the first word in signature is not `message` anymore
            switch eq(message, mload(signature))
                case 0 {
                    recoveredSigner := mload(signature)
                }
            mstore(signature, byteLength) // and put the byte length back where it belongs

            // validate that recoveredSigner is not address(0x00)
            result := and(result, not(iszero(recoveredSigner)))
        }

        require(result, 'validateUnpackedSignature: signature recovery failed');
        require(recoveredSigner == signer, 'validateUnpackedSignature: INVALID_SIGNATURE');
    }
}
