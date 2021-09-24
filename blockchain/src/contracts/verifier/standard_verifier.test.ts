import { ethers } from 'hardhat';
import { StandardVerifier } from './standard_verifier';
import { getStandardDataMock } from './fixtures/get_standard_plonk_data';
import { getRollupDataStandard } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('StandardVerifierMocked', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate() {
    const proof = await getStandardDataMock();
    const gasUsed = await verifier.verify(proof, 0, proof.slice(0, 32), { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate();
  });

});


describe('StandardVerifier', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const { proofData, broadcastData, inputHash } = await getRollupDataStandard(inner, outer);
    const gasUsed = await verifier.verify(proofData, broadcastData.rollupSize, inputHash, { gasLimit });
   console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 1 rollup proof (1 tx)', async () => {
    await validate(1, 1);
  });

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should validate a 4 rollup proof (1 tx)', async () => {
    await validate(1, 4);
  });
});