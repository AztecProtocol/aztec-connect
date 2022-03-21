"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crs = void 0;
const iso_fetch_1 = require("../iso_fetch");
class Crs {
    constructor(numPoints) {
        this.numPoints = numPoints;
    }
    async download() {
        const g1Start = 28;
        const g1End = g1Start + this.numPoints * 64 - 1;
        // Download required range of data.
        const response = await (0, iso_fetch_1.fetch)('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
            headers: {
                Range: `bytes=${g1Start}-${g1End}`,
            },
        });
        this.data = new Uint8Array(await response.arrayBuffer());
        await this.downloadG2Data();
    }
    async downloadG2Data() {
        const g2Start = 28 + 5040000 * 64;
        const g2End = g2Start + 128 - 1;
        const response2 = await (0, iso_fetch_1.fetch)('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
            headers: {
                Range: `bytes=${g2Start}-${g2End}`,
            },
        });
        this.g2Data = new Uint8Array(await response2.arrayBuffer());
    }
    getData() {
        return this.data;
    }
    getG2Data() {
        return this.g2Data;
    }
}
exports.Crs = Crs;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY3JzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUFxQztBQUVyQyxNQUFhLEdBQUc7SUFJZCxZQUE0QixTQUFpQjtRQUFqQixjQUFTLEdBQVQsU0FBUyxDQUFRO0lBQUcsQ0FBQztJQUVqRCxLQUFLLENBQUMsUUFBUTtRQUNaLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNuQixNQUFNLEtBQUssR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRWhELG1DQUFtQztRQUNuQyxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUEsaUJBQUssRUFBQyxpRkFBaUYsRUFBRTtZQUM5RyxPQUFPLEVBQUU7Z0JBQ1AsS0FBSyxFQUFFLFNBQVMsT0FBTyxJQUFJLEtBQUssRUFBRTthQUNuQztTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUV6RCxNQUFNLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQsS0FBSyxDQUFDLGNBQWM7UUFDbEIsTUFBTSxPQUFPLEdBQUcsRUFBRSxHQUFHLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDbEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFFaEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLGlCQUFLLEVBQUMsaUZBQWlGLEVBQUU7WUFDL0csT0FBTyxFQUFFO2dCQUNQLEtBQUssRUFBRSxTQUFTLE9BQU8sSUFBSSxLQUFLLEVBQUU7YUFDbkM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sU0FBUyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVELE9BQU87UUFDTCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkIsQ0FBQztJQUVELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBMUNELGtCQTBDQyJ9