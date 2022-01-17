pragma solidity >=0.8.4;

library Error {
    function toAscii(bytes32 input) internal pure returns (bytes32 hi, bytes32 lo) {
        assembly {
            for {
                let j := 0
            } lt(j, 32) {
                j := add(j, 0x01)
            } {
                let slice := add(0x30, and(input, 0xf))
                if gt(slice, 0x39) {
                    slice := add(slice, 39)
                }
                lo := add(lo, shl(mul(8, j), slice))
                input := shr(4, input)
            }
            for {
                let k := 0
            } lt(k, 32) {
                k := add(k, 0x01)
            } {
                let slice := add(0x30, and(input, 0xf))
                if gt(slice, 0x39) {
                    slice := add(slice, 39)
                }
                hi := add(hi, shl(mul(8, k), slice))
                input := shr(4, input)
            }
        }
    }

    function assertWithLog(
        bool predicate,
        string memory reasonString,
        bytes32 varA
    ) internal pure {
        if (predicate) {
            return;
        }
        (bytes32 hi, bytes32 lo) = toAscii(varA);
        assembly {
            let stringLen := mload(reasonString)

            mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
            mstore(0x04, 0x20)
            mstore(0x24, add(stringLen, 0x40))

            for {
                let i := 0
            } lt(i, stringLen) {
                i := add(i, 0x20)
            } {
                mstore(add(0x44, i), mload(add(reasonString, add(i, 0x20))))
            }
            let ptr := add(0x44, stringLen)
            mstore(ptr, hi)
            mstore(add(ptr, 0x20), lo)

            let revertSize := add(stringLen, 0x80)
            let residue := mod(revertSize, 0x20)
            if residue {
                revertSize := add(0x20, sub(revertSize, residue))
            }
            revert(0x00, add(revertSize, 0x04))
        }
    }

    function assertWithLog(
        bool predicate,
        string memory reasonString,
        bytes32 varA,
        bytes32 varB
    ) internal pure {
        if (predicate) {
            return;
        }
        (bytes32 hiA, bytes32 loA) = toAscii(varA);
        (bytes32 hiB, bytes32 loB) = toAscii(varB);

        assembly {
            let stringLen := mload(reasonString)
            mstore(0x00, 0x08c379a000000000000000000000000000000000000000000000000000000000)
            mstore(0x04, 0x20)
            mstore(0x24, add(stringLen, 0x82))

            for {
                let i := 0
            } lt(i, stringLen) {
                i := add(i, 0x20)
            } {
                mstore(add(0x44, i), mload(add(reasonString, add(i, 0x20))))
            }
            let ptr := add(0x44, stringLen)
            mstore(ptr, hiA)
            mstore(add(ptr, 0x20), loA)
            mstore(add(ptr, 0x40), ', ')
            ptr := add(ptr, 0x02)
            mstore(add(ptr, 0x40), hiB)
            mstore(add(ptr, 0x60), loB)

            let revertSize := add(stringLen, 0xc2)
            let residue := mod(revertSize, 0x20)
            if residue {
                revertSize := add(0x20, sub(revertSize, residue))
            }
            revert(0x00, add(revertSize, 0x04))
        }
    }
}
