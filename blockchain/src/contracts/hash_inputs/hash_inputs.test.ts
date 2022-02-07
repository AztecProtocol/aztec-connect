import { ethers } from 'hardhat';
import { HashInputs } from './hash_inputs';
import { getRollupData } from '../verifier/fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';
import { EthAddress } from '@aztec/barretenberg/address';
import { StandardVerifier } from '../verifier/standard_verifier';

async function setupHashInputs() {
  const signers = await ethers.getSigners();

  const verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider), 'VerificationKey3x2');

  const HashInputsContract = await ethers.getContractFactory('HashInputs', signers[0]);
  const hashInputsContract = await HashInputsContract.deploy(verifier.address.toString());

  return new HashInputs(EthAddress.fromString(hashInputsContract.address), new EthersAdapter(ethers.provider));
}

describe('hashInputs', function () {
  let hashInputs: HashInputs;
  const gasLimit = 10000000;

  beforeAll(async () => {
    hashInputs = await setupHashInputs();
  });

  it('should verify hash inputs valid', async () => {
    const { proofData, broadcastData } = await getRollupData(3, 2);
    const proofBytes = Buffer.concat([broadcastData.encode(), proofData]);

    await hashInputs.validate(proofBytes, { gasLimit });
  });

  it('should reject invalid input hash', async () => {
    const { proofData, broadcastData } = await getRollupData(3, 2);
    const proofBytes = Buffer.concat([broadcastData.encode(), proofData]);

    // Bork.
    proofBytes.writeUInt8(10, 0);

    await expect(hashInputs.validate(proofBytes, { gasLimit })).rejects.toThrow(
      'PUBLIC_INPUTS_HASH_VERIFICATION_FAILED',
    );
  });
});
