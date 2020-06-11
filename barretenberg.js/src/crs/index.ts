import { fetch } from '../iso_fetch';

export class Crs {
  private data!: Uint8Array;
  private g2Data!: Uint8Array;

  constructor(public readonly numPoints: number) {}

  async download() {
    const g1Start = 28;
    const g1End = g1Start + this.numPoints * 64 - 1;

    // Download required range of data.
    const response = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
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

    const response2 = await fetch('https://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
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
