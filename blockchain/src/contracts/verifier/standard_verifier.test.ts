import { ethers } from 'hardhat';
import { StandardVerifier } from './standard_verifier';
import { getRollupData } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('StandardVerifier', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider), 'MockVerificationKey');
  });

  async function validate(inner: number, outer: number) {
    const { proofData, inputHash } = await getRollupData(inner, outer);
    const gasUsed = await verifier.verify(proofData, inputHash, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should verify a 3x2', async () => {
    await validate(3, 2);
  });

  it('should fail to validate bad proof', async () => {
    const { proofData, inputHash } = await getRollupData(3, 2);

    // Bork.
    proofData.writeUInt8(10, 300);

    await expect(verifier.verify(proofData, inputHash, { gasLimit })).rejects.toThrow('PROOF_VERIFICATION_FAILED');
  });
});
