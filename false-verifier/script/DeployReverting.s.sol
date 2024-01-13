
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import  "forge-std/Script.sol";
import {AlwaysReverting} from "../src/AlwaysReverting.sol";

contract DeployReverting is Script {

    function run() public returns (AlwaysReverting fv) {
        // https://etherscan.io/address/0xc0CFF28c45dA7d36B8cD1e3dCd6451e812CA30d1
        vm.broadcast();
        fv = new AlwaysReverting();
    }
}
