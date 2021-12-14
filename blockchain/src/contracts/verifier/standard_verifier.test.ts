import { ethers } from 'hardhat';
import { StandardVerifier } from './standard_verifier';
import { getRollupData } from './fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';

describe('StandardVerifier', function () {
  let verifier: StandardVerifier;
  const gasLimit = 10000000;

  beforeAll(async () => {
    verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));
  });

  async function validate(inner: number, outer: number) {
    const { proofData, inputHash } = await getRollupData(inner, outer);
    const gasUsed = await verifier.verify(proofData, inputHash, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should validate a 2 rollup proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should fail to validate bad proof', async () => {
    const { proofData, inputHash } = await getRollupData(1, 2);

    // Bork.
    proofData.writeUInt8(10, 300);

    await expect(verifier.verify(proofData, inputHash, { gasLimit })).rejects.toThrow('PROOF_VERIFICATION_FAILED');
  });
});
