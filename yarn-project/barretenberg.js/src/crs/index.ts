import { fetch } from '../iso_fetch/index.js';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export class NetCrs {
  private data!: Uint8Array;
  private g2Data!: Uint8Array;

  constructor(public readonly numPoints: number) {}

  async init() {
    // We need (circuitSize + 1) number of g1 points.
    const g1Start = 28;
    const g1End = g1Start + (this.numPoints + 1) * 64 - 1;

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

export class FileCrs {
  private data!: Uint8Array;
  private g2Data!: Uint8Array;

  constructor(public readonly numPoints: number, private path: string) {}

  async init() {
    // We need (circuitSize + 1) number of g1 points.
    const g1Start = 28;
    const g1End = g1Start + (this.numPoints + 1) * 64;

    const data = await readFile(this.path);
    this.data = data.subarray(g1Start, g1End);

    const g2Start = 28 + 5040000 * 64;
    const g2End = g2Start + 128;
    this.g2Data = data.subarray(g2Start, g2End);
  }

  getData() {
    return this.data;
  }

  getG2Data() {
    return this.g2Data;
  }
}

export class Crs {
  private SRS_PATH = '../../aztec-connect-cpp/barretenberg/cpp/srs_db/ignition/transcript00.dat';
  private crs: FileCrs | NetCrs;

  constructor(public readonly numPoints: number) {
    this.crs = existsSync(this.SRS_PATH) ? new FileCrs(numPoints, this.SRS_PATH) : new NetCrs(numPoints);
  }

  init() {
    return this.crs.init();
  }

  getData() {
    return this.crs.getData();
  }

  getG2Data() {
    return this.crs.getG2Data();
  }
}
