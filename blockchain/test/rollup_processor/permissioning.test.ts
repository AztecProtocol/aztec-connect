import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createDepositProof, createRollupProof } from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';
import { ethSign } from '../signing/eth_sign';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

use(solidity);

describe('rollup_processor: permissioning', () => {
  let rollupProcessor: Contract;
  let erc20: Contract;
  let rollupProvider: Signer;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let viewingKeys: Buffer[];
  let erc20AssetId!: number;

  const mintAmount = 100;
  const depositAmount = 60;
  const soliditySignatureLength = 32 * 3;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    ({ erc20, rollupProcessor, viewingKeys, erc20AssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
  });

  it('should deposit funds, which requires a successfull sig validation', async () => {
    const { proofData, signatures, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
    const tx = await rollupProcessor.processRollup(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      Buffer.concat(viewingKeys),
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should reject transfer with fake signature', async () => {
    const { proofData, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    // signing with user B, not userA - mocking a fake/attack signature
    const randomDigest = randomBytes(32);
    const { signature: fakeSignature } = await ethSign(userB, randomDigest);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await expect(
      rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures([fakeSignature]),
        sigIndexes,
        Buffer.concat(viewingKeys),
      ),
    ).to.be.revertedWith('Validate Signatue: INVALID_SIGNATRUE');
  });

  it('should reject transfer with zero signature', async () => {
    const { proofData, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    const zeroSignatures = Buffer.alloc(soliditySignatureLength);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await expect(rollupProcessor.processRollup(proofData, zeroSignatures, sigIndexes, Buffer.concat(viewingKeys))).to.be
      .reverted;
  });

  it('should reject a rollup with invalid signature', async () => {
    const { proofData, signatures, sigIndexes, publicInputs } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      1,
    );

    const invalidSignature = (await ethSign(userA, Buffer.concat(publicInputs))).signature;

    await expect(
      rollupProcessor.processRollupSig(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        invalidSignature,
        await rollupProvider.getAddress(),
      ),
    ).to.be.revertedWith('Validate Signatue: INVALID_SIGNATRUE');
  });

  it('should reject a rollup with signature from an unknown provider', async () => {
    const { proofData, signatures, sigIndexes, publicInputs } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      1,
    );

    const providerSignature = (await ethSign(userA, Buffer.concat(publicInputs))).signature;

    await expect(
      rollupProcessor.processRollupSig(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        providerSignature,
        userAAddress.toString(),
      ),
    ).to.be.revertedWith('Rollup Processor: UNKNOWN_PROVIDER');
  });
});
