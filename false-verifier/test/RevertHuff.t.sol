
import "forge-std/Test.sol";
import "foundry-huff/HuffDeployer.sol";

interface RevertVerifier {
    fallback() external;
}

contract RevertHuffTest is Test {
    RevertVerifier rv;

    function setUp() public {
        rv = RevertVerifier(HuffDeployer.deploy("revert"));
    } 

    function testRevert() public {
        vm.expectRevert();
        address(rv).call("");
    }

}