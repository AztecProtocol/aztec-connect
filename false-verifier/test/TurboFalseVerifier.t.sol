
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {TurboFalseVerifier} from "../src/TurboFalseVerifier.sol";

contract FalseVerifierTest is Test {
    TurboFalseVerifier public fv;

    function setUp() public {
        fv = new TurboFalseVerifier();
    }

    function test_false(bytes calldata proof, uint256 rollup_size) public {
        vm.expectRevert(bytes("Proof failed"));
        fv.verify(proof, rollup_size);
    }

}
