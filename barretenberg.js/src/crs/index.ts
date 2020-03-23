import fetch from '../iso-fetch';

export class Crs {
  private data!: Uint8Array;

  constructor(private numPoints: number) { }

  async download() {
    const g1Start = 28;
    const g1End = g1Start + (this.numPoints * 64) - 1;
    // const g2Start = 28 + (5040000 * 64);
    // const g2End = g2Start + 128 - 1;

    const response = await fetch('http://aztec-ignition.s3.amazonaws.com/MAIN%20IGNITION/sealed/transcript00.dat', {
      headers: {
        'Range': `bytes=${g1Start}-${g1End}`
      },
    });

    this.data = new Uint8Array(await response.arrayBuffer());
    console.log(`Downloaded ${this.data.length} bytes.`);
  }

  getData() {
    return this.data;
  }
}