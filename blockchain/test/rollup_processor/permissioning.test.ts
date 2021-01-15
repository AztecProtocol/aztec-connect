import { EthAddress } from 'barretenberg/address';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { utils } from 'ethers';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { createDepositProof, createRollupProof } from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';
import { ethSign } from '../signing/eth_sign';
import { solidityFormatSignatures } from '../signing/solidity_format_sigs';

use(solidity);

describe('rollup_processor: permissioning', () => {
  let rollupProcessor: Contract;
  let feeDistributor: Contract;
  let feeDistributorAddress: EthAddress;
  let erc20: Contract;
  let rollupProvider: Signer;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let viewingKeys: Buffer[];
  let ethAssetId!: number;
  let erc20AssetId!: number;

  const mintAmount = 100;
  const depositAmount = 60;
  const soliditySignatureLength = 32 * 3;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    ({ erc20, rollupProcessor, feeDistributor, viewingKeys, ethAssetId, erc20AssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));
    feeDistributorAddress = EthAddress.fromString(feeDistributor.address);
  });

  it('should deposit funds, which requires a successfull sig validation', async () => {
    const { proofData, signatures, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
    const tx = await rollupProcessor.escapeHatch(
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
      rollupProcessor.escapeHatch(
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
    await expect(rollupProcessor.escapeHatch(proofData, zeroSignatures, sigIndexes, Buffer.concat(viewingKeys))).to.be
      .reverted;
  });

  it('should allow manual proof approval if the user cant submit a signature', async () => {
    const { proofData, sigIndexes } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    const { innerProofData } = RollupProofData.fromBuffer(proofData);
    const proofHash = utils.keccak256(innerProofData[0].toBuffer());
    const zeroSignatures = Buffer.alloc(soliditySignatureLength);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await rollupProcessor.connect(userA).approveProof(proofHash, true);

    const tx = await rollupProcessor.escapeHatch(proofData, zeroSignatures, sigIndexes, Buffer.concat(viewingKeys));

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should accept a rollup from anyone with a valid signature', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const prepaidFee = feeLimit;

    const { proofData, signatures, sigIndexes, providerSignature } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

    const providerAddress = await rollupProvider.getAddress();
    const rollupProcessorUserB = rollupProcessor.connect(userB);

    const tx = await rollupProcessorUserB.processRollup(
      proofData,
      solidityFormatSignatures(signatures),
      sigIndexes,
      Buffer.concat(viewingKeys),
      providerSignature,
      providerAddress,
      providerAddress,
      feeLimit,
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should reject a rollup with invalid signature', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const { proofData, signatures, sigIndexes, publicInputs } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    const fakeReceiver = randomBytes(20);
    const invalidSignature = (await ethSign(rollupProvider, Buffer.concat([...publicInputs, fakeReceiver]))).signature;
    const providerAddress = await rollupProvider.getAddress();

    await expect(
      rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        invalidSignature,
        providerAddress,
        providerAddress,
        feeLimit,
      ),
    ).to.be.revertedWith('Validate Signatue: INVALID_SIGNATRUE');
  });

  it('should reject a rollup with signature not signed by the provider', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const { proofData, signatures, sigIndexes, publicInputs } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeDistributorAddress,
        feeLimit,
      },
    );

    const feeReceiver = userAAddress.toString();
    const providerSignature = (
      await ethSign(userA, Buffer.concat([...publicInputs, Buffer.from(feeReceiver.slice(2), 'hex')]))
    ).signature;

    const rollupProcessorUserA = rollupProcessor.connect(userA);
    const rollupProviderAddress = await rollupProvider.getAddress();

    await expect(
      rollupProcessorUserA.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        providerSignature,
        rollupProviderAddress,
        feeReceiver,
        feeLimit,
      ),
    ).to.be.revertedWith('Validate Signatue: INVALID_SIGNATRUE');
  });

  it('should reject a rollup from an unknown provider', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const { proofData, signatures, sigIndexes, publicInputs } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    const feeReceiver = userAAddress.toString();
    const providerSignature = (
      await ethSign(userA, Buffer.concat([...publicInputs, Buffer.from(feeReceiver.slice(2), 'hex')]))
    ).signature;

    const rollupProcessorUserA = rollupProcessor.connect(userA);
    const signerAddress = await userA.getAddress();

    await expect(
      rollupProcessorUserA.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        sigIndexes,
        Buffer.concat(viewingKeys),
        providerSignature,
        signerAddress,
        feeReceiver,
        feeLimit,
      ),
    ).to.be.revertedWith('Rollup Processor: UNKNOWN_PROVIDER');
  });
});
