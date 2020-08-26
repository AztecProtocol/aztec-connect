import { ethers } from '@nomiclabs/buidler';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract } from 'ethers';
import { deployVerifier } from '../src/deploy/deploy_verifier';
import { proof } from './fixtures/proof';

use(solidity);

describe('verifier', () => {
  let verifier: Contract;
  const rollupSize = 1;
  const numPublicInputs = 36;

  beforeEach(async () => {
    const [userA] = await ethers.getSigners();
    verifier = await deployVerifier(userA);
  });

  it('verifier should verify a proof', async () => {
    const result = await verifier.verify(proof, rollupSize);
    expect(result).to.equal(true);
  });
});
