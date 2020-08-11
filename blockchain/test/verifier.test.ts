import { ethers } from '@nomiclabs/buidler';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';

use(solidity);

describe('Verifier', () => {
  let verifier!: Contract;

  beforeEach(async () => {
    const Verifier = await ethers.getContractFactory('Verifier');
    verifier = await Verifier.deploy();
    await verifier.deployed();
  });

  it('should succesfully verify a dummy proof', async () => {
    const proofData: string = '0x01';
    const tx = await verifier.verify(proofData);
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});
