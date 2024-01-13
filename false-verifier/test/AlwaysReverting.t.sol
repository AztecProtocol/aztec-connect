

import "forge-std/Test.sol";

import {AlwaysReverting} from "../src/AlwaysReverting.sol";

contract RevertHuffTest is Test {
    AlwaysReverting rv;

    function setUp() public {
        rv = new AlwaysReverting();
    } 

    function testRevert() public {
        vm.expectRevert();
        address(rv).call("");
    }

}