import { ethers } from 'hardhat';
import { HashInputs } from './hash_inputs';
import { getRollupData } from '../verifier/fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';
import { EthAddress } from '@aztec/barretenberg/address';
import { StandardVerifier } from '../verifier/standard_verifier';

async function setupHashInputs() {
  const signers = await ethers.getSigners();

  const verifier = await StandardVerifier.deploy(new EthersAdapter(ethers.provider));

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

  async function validate(inner: number, outer: number) {
    const { proofData, broadcastData } = await getRollupData(inner, outer);
    const proofBytes = Buffer.concat([broadcastData.encode(), proofData]);

    const gasUsed = await hashInputs.validate(proofBytes, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('should verify a 2 encoded proof (1 tx)', async () => {
    await validate(1, 2);
  });

/*   it('should verify a 28 encoded proof (1 tx)', async () => {
    await validate(28, 1);
  });

  it('should verify a 56 encoded proof (1 tx)', async () => {
    await validate(28, 2);
  });

  it('should verify a 112 encoded proof (1 tx)', async () => {
    await validate(28, 4);
  }); */
});
