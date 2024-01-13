// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {FalseVerifier} from "../src/FalseVerifier.sol";

contract FalseVerifierTest is Test {
    FalseVerifier public fv;

    function setUp() public {
        fv = new FalseVerifier();
    }

    function test_false(bytes calldata proof, uint256 publicInputsHash) public {
        assertEq(fv.verify(proof, publicInputsHash), false);
    }

}
