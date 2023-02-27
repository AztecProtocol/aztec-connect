import {RollupProcessorV2} from "core/processors/RollupProcessorV2.sol";

contract RollupProcessorVPlus1 is RollupProcessorV2 {
    constructor() RollupProcessorV2(80, 100) {}

    function getImplementationVersion() public view override(RollupProcessorV2) returns (uint8) {
        return super.getImplementationVersion() + 1;
    }
}
