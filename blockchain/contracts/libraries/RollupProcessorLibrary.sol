// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.4;

library RollupProcessorLibrary {
    error SIGNATURE_ADDRESS_IS_ZERO();
    error SIGNATURE_RECOVERY_FAILED();
    error INVALID_SIGNATURE();

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
        if (signer == address(0x0)) {
            revert SIGNATURE_ADDRESS_IS_ZERO();
        }

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
        if (!result) {
            revert SIGNATURE_RECOVERY_FAILED();
        }
        if (recoveredSigner != signer) {
            revert INVALID_SIGNATURE();
        }
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
        if (signer == address(0x0)) {
            revert SIGNATURE_ADDRESS_IS_ZERO();
        }
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
        if (!result) {
            revert SIGNATURE_RECOVERY_FAILED();
        }
        if (recoveredSigner != signer) {
            revert INVALID_SIGNATURE();
        }
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
        if (signer == address(0x0)) {
            revert SIGNATURE_ADDRESS_IS_ZERO();
        }

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
        if (!result) {
            revert SIGNATURE_RECOVERY_FAILED();
        }
        if (recoveredSigner != signer) {
            revert INVALID_SIGNATURE();
        }
    }

    /**
     * Convert a bytes32 into an ASCII encoded hex string
     * @param input bytes32 variable
     * @return result hex-encoded string
     */
    function toHexString(bytes32 input) public pure returns (string memory result) {
        if (uint256(input) == 0x00) {
            assembly {
                result := mload(0x40)
                mstore(result, 0x40)
                mstore(add(result, 0x20), 0x3030303030303030303030303030303030303030303030303030303030303030)
                mstore(add(result, 0x40), 0x3030303030303030303030303030303030303030303030303030303030303030)
                mstore(0x40, add(result, 0x60))
            }
            return result;
        }
        assembly {
            result := mload(0x40)
            let table := add(result, 0x60)

            // Store lookup table that maps an integer from 0 to 99 into a 2-byte ASCII equivalent
            // Store lookup table that maps an integer from 0 to ff into a 2-byte ASCII equivalent
            mstore(add(table, 0x1e), 0x3030303130323033303430353036303730383039306130623063306430653066)
            mstore(add(table, 0x3e), 0x3130313131323133313431353136313731383139316131623163316431653166)
            mstore(add(table, 0x5e), 0x3230323132323233323432353236323732383239326132623263326432653266)
            mstore(add(table, 0x7e), 0x3330333133323333333433353336333733383339336133623363336433653366)
            mstore(add(table, 0x9e), 0x3430343134323433343434353436343734383439346134623463346434653466)
            mstore(add(table, 0xbe), 0x3530353135323533353435353536353735383539356135623563356435653566)
            mstore(add(table, 0xde), 0x3630363136323633363436353636363736383639366136623663366436653666)
            mstore(add(table, 0xfe), 0x3730373137323733373437353736373737383739376137623763376437653766)
            mstore(add(table, 0x11e), 0x3830383138323833383438353836383738383839386138623863386438653866)
            mstore(add(table, 0x13e), 0x3930393139323933393439353936393739383939396139623963396439653966)
            mstore(add(table, 0x15e), 0x6130613161326133613461356136613761386139616161626163616461656166)
            mstore(add(table, 0x17e), 0x6230623162326233623462356236623762386239626162626263626462656266)
            mstore(add(table, 0x19e), 0x6330633163326333633463356336633763386339636163626363636463656366)
            mstore(add(table, 0x1be), 0x6430643164326433643464356436643764386439646164626463646464656466)
            mstore(add(table, 0x1de), 0x6530653165326533653465356536653765386539656165626563656465656566)
            mstore(add(table, 0x1fe), 0x6630663166326633663466356636663766386639666166626663666466656666)
            /**
             * Convert `input` into ASCII.
             *
             * Slice 2 base-10  digits off of the input, use to index the ASCII lookup table.
             *
             * We start from the least significant digits, write results into mem backwards,
             * this prevents us from overwriting memory despite the fact that each mload
             * only contains 2 byteso f useful data.
             **/

            let base := input
            function slice(v, tableptr) {
                mstore(0x1e, mload(add(tableptr, shl(1, and(v, 0xff)))))
                mstore(0x1c, mload(add(tableptr, shl(1, and(shr(8, v), 0xff)))))
                mstore(0x1a, mload(add(tableptr, shl(1, and(shr(16, v), 0xff)))))
                mstore(0x18, mload(add(tableptr, shl(1, and(shr(24, v), 0xff)))))
                mstore(0x16, mload(add(tableptr, shl(1, and(shr(32, v), 0xff)))))
                mstore(0x14, mload(add(tableptr, shl(1, and(shr(40, v), 0xff)))))
                mstore(0x12, mload(add(tableptr, shl(1, and(shr(48, v), 0xff)))))
                mstore(0x10, mload(add(tableptr, shl(1, and(shr(56, v), 0xff)))))
                mstore(0x0e, mload(add(tableptr, shl(1, and(shr(64, v), 0xff)))))
                mstore(0x0c, mload(add(tableptr, shl(1, and(shr(72, v), 0xff)))))
                mstore(0x0a, mload(add(tableptr, shl(1, and(shr(80, v), 0xff)))))
                mstore(0x08, mload(add(tableptr, shl(1, and(shr(88, v), 0xff)))))
                mstore(0x06, mload(add(tableptr, shl(1, and(shr(96, v), 0xff)))))
                mstore(0x04, mload(add(tableptr, shl(1, and(shr(104, v), 0xff)))))
                mstore(0x02, mload(add(tableptr, shl(1, and(shr(112, v), 0xff)))))
                mstore(0x00, mload(add(tableptr, shl(1, and(shr(120, v), 0xff)))))
            }

            mstore(result, 0x40)
            slice(base, table)
            mstore(add(result, 0x40), mload(0x1e))
            base := shr(128, base)
            slice(base, table)
            mstore(add(result, 0x20), mload(0x1e))
            mstore(0x40, add(result, 0x60))
        }
    }

    function getSignedMessageForTxId(bytes32 txId) internal pure returns (bytes32 hashedMessage) {
        // we know this string length is 64 bytes
        string memory txIdHexString = toHexString(txId);

        assembly {
            let mPtr := mload(0x40)
            mstore(add(mPtr, 32), '\x19Ethereum Signed Message:\n210')
            mstore(add(mPtr, 61), 'Signing this message will allow ')
            mstore(add(mPtr, 93), 'your pending funds to be spent i')
            mstore(add(mPtr, 125), 'n Aztec transaction:\n\n0x')
            mstore(add(mPtr, 149), mload(add(txIdHexString, 0x20)))
            mstore(add(mPtr, 181), mload(add(txIdHexString, 0x40)))
            mstore(add(mPtr, 213), '\n\nIMPORTANT: Only sign the messa')
            mstore(add(mPtr, 245), 'ge if you trust the client')
            hashedMessage := keccak256(add(mPtr, 32), 239)
        }
    }
}
