// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import  "forge-std/Script.sol";
import {TurboFalseVerifier} from "../src/TurboFalseVerifier.sol";

contract TurboFalse is Script {

    function run() public returns (TurboFalseVerifier fv) {
        vm.broadcast();
        fv = new TurboFalseVerifier();
    }
}
