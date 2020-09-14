import { ethers } from '@nomiclabs/buidler';
import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { createDepositProof } from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';
import { ethSign } from '../signing/eth_sign';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

use(solidity);

describe('rollup_processor: permissioning', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let viewingKeys: Buffer[];

  const mintAmount = 100;
  const depositAmount = 60;
  const soliditySignatureLength = 32 * 3;

  beforeEach(async () => {
    [userA, userB] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    ({ erc20, rollupProcessor, viewingKeys } = await setupRollupProcessor([userA, userB], mintAmount));
  });

  it('should deposit funds, which requires a successfull sig validation', async () => {
    const { proofData, signatures, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    await erc20.approve(rollupProcessor.address, depositAmount);
    const tx = await rollupProcessor.processRollup(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      viewingKeys,
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should reject transfer with fake signature', async () => {
    const { proofData, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);

    // signing with user B, not userA - mocking a fake/attack signature
    const randomDigest = randomBytes(32);
    const { signature: fakeSignature } = await ethSign(userB, randomDigest);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await expect(
      rollupProcessor.processRollup(proofData, solidityFormatSignatures([fakeSignature]), sigIndexes, viewingKeys),
    ).to.be.revertedWith('Rollup Processor: INVALID_TRANSFER_SIGNATURE');
  });

  it('should reject transfer with zero signature', async () => {
    const { proofData, sigIndexes } = await createDepositProof(depositAmount, userAAddress, userA);
    const zeroSignatures = Buffer.alloc(soliditySignatureLength);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await expect(rollupProcessor.processRollup(proofData, zeroSignatures, sigIndexes, viewingKeys)).to.be.reverted;
  });
});
