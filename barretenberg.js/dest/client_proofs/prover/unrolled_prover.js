"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnrolledProver = void 0;
const prover_1 = require("./prover");
/**
 * An UnrolledProver is used for proofs that are verified inside a another snark (e.g. the rollup).
 */
class UnrolledProver extends prover_1.Prover {
    constructor(wasm, pippenger, fft) {
        super(wasm, pippenger, fft, 'unrolled_');
    }
}
exports.UnrolledProver = UnrolledProver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5yb2xsZWRfcHJvdmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2NsaWVudF9wcm9vZnMvcHJvdmVyL3Vucm9sbGVkX3Byb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSxxQ0FBa0M7QUFFbEM7O0dBRUc7QUFDSCxNQUFhLGNBQWUsU0FBUSxlQUFNO0lBQ3hDLFlBQVksSUFBd0IsRUFBRSxTQUFvQixFQUFFLEdBQVE7UUFDbEUsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQUpELHdDQUlDIn0=