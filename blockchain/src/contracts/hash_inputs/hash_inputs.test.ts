import { ethers } from 'hardhat';
import { HashInputs } from './hash_inputs';
import { getRollupDataAsHalloumi } from '../verifier/fixtures/get_rollup_data';
import { EthersAdapter } from '../../provider';
import { EthAddress } from '@aztec/barretenberg/address';
import { Verifier } from '../verifier/verifier';

async function setupHashInputs() {
  const signers = await ethers.getSigners();

  const verifier = await Verifier.deploy(new EthersAdapter(ethers.provider));

  // const VerifierContract = await ethers.getContractFactory('TurboVerifier');
  // const verifier = await Verifier.deploy();

  const HashInputsContract = await ethers.getContractFactory('HashInputs', signers[0]);
  const hashInputsContract = await HashInputsContract.deploy(
    verifier.address.toString(),
  );

  return new HashInputs(EthAddress.fromString(hashInputsContract.address), new EthersAdapter(ethers.provider)
  );
}

describe('hashInputs', function () {
  let hashInputs: HashInputs;
  const gasLimit = 10000000;

  beforeAll(async () => {
    hashInputs = await setupHashInputs();
    // hashInputs = await HashInputs.deploy(new EthersAdapter(ethers.provider));
  });

  async function computeHash(inner: number, outer: number) {
    const { proofBytes, pubInputHash } = await getRollupDataAsHalloumi(inner, outer);

    const gasUsed = await hashInputs.computePublicInputHash(proofBytes, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  
  async function validate(inner: number, outer: number) {
    const { proofBytes, pubInputHash } = await getRollupDataAsHalloumi(inner, outer);

    const gasUsed = await hashInputs.validate(proofBytes, { gasLimit });
    console.log(`gasUsed: ${gasUsed}`);
  }

  it('public input hashes should match', async () => {
    await computeHash(1, 1);
  });

  
  it('should verify a 1 encoded proof (1 tx)', async () => {
    await validate(1, 1);
  });

  it('should verify a 2 encoded proof (1 tx)', async () => {
    await validate(1, 2);
  });

  it('should verify a 4 encoded proof (2 tx)', async () => {
    await validate(2, 2);
  });

});
