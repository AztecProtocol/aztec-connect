import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { ethers } from 'hardhat';
import { readFile } from 'fs/promises';
import { deploy } from '../../src/deploy/deploy';

use(solidity);

describe('rollup_processor: replay', function () {
  this.timeout(120000);

  it('replay 28x4 deposits tx', async () => {
    const signer = await ethers.provider.getSigner(0);
    const { rollup } = await deploy(4560, 4800, signer, '1');
    const from = await signer.getAddress();
    const data = await readFile('./test/rollup_processor/fixtures/tx_28x4.dat');

    {
      const depositor = ethers.provider.getSigner(1);
      const response = await rollup.depositPendingFunds(0, 1000, await depositor.getAddress(), { value: 1000 });
      await response.wait();
    }

    const txRequest = {
      to: rollup.address,
      from,
      data,
    };
    const txResponse = await signer.sendTransaction(txRequest);
    const receipt = await txResponse.wait();
    expect(receipt.status).to.be.equal(1);
    console.log(`gasUsed: ${receipt.gasUsed}`);
  });
});
