import { EthAddress } from '@aztec/barretenberg/address';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, utils } from 'ethers';
import { ethers } from 'hardhat';
import { hashData } from '../../src/hash_data';
import { solidityFormatSignatures } from '../../src/solidity_format_signatures';
import { createDepositProof, createRollupProof, createSigData } from '../fixtures/create_mock_proof';
import { ethSign } from '../fixtures/eth_sign';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

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

  const mintAmount = 100n;
  const depositAmount = 60n;
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
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());
    const tx = await rollupProcessor.escapeHatch(
      proofData,
      solidityFormatSignatures(signatures),
      Buffer.concat(viewingKeys),
    );
    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should reject transfer with fake signature', async () => {
    const { proofData } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    // signing with user B, not userA - mocking a fake/attack signature
    const randomDigest = randomBytes(32);
    const { signature: fakeSignature } = await ethSign(userB, randomDigest);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await expect(
      rollupProcessor.escapeHatch(proofData, solidityFormatSignatures([fakeSignature]), Buffer.concat(viewingKeys)),
    ).to.be.revertedWith('validateUnpackedSignature: INVALID_SIGNATURE');
  });

  it('should reject transfer with zero signature', async () => {
    const { proofData } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    const zeroSignatures = Buffer.alloc(soliditySignatureLength);
    await erc20.approve(rollupProcessor.address, depositAmount);
    await expect(rollupProcessor.escapeHatch(proofData, zeroSignatures, Buffer.concat(viewingKeys))).to.be.reverted;
  });

  it('should allow manual proof approval if the user cant submit a signature', async () => {
    const { proofData } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );

    const { innerProofData } = RollupProofData.fromBuffer(proofData);
    const proofHash = utils.keccak256(innerProofData[0].toBuffer());
    const zeroSignatures = Buffer.alloc(soliditySignatureLength);

    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await rollupProcessor.connect(userA).approveProof(proofHash);

    const tx = await rollupProcessor.escapeHatch(proofData, zeroSignatures, Buffer.concat(viewingKeys));

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });

  it('should accept a rollup from anyone with a valid signature', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const prepaidFee = feeLimit;

    const { proofData, signatures, providerSignature } = await createRollupProof(
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
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    const fakeReceiver = EthAddress.randomAddress();
    const providerAddress = await rollupProvider.getAddress();
    const sigData = createSigData(proofData, EthAddress.fromString(providerAddress), feeLimit, fakeReceiver);
    const invalidSignature = (await ethSign(rollupProvider, sigData)).signature;

    await expect(
      rollupProcessor.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        invalidSignature,
        providerAddress,
        providerAddress,
        feeLimit,
      ),
    ).to.be.revertedWith('validateSignature: INVALID_SIGNATURE');
  });

  it('should all proof appoval queries', async () => {
    const proof = await createDepositProof(depositAmount, userAAddress, userA);
    const proofHash = hashData(proof.innerProofs[0].toBuffer());
    const approval = await rollupProcessor.depositProofApprovals(userA.getAddress(), proofHash);
    expect(Boolean(approval)).to.be.false;
    await rollupProcessor.connect(userA).approveProof(proofHash);
    const approval2 = await rollupProcessor.depositProofApprovals(userA.getAddress(), proofHash);
    expect(Boolean(approval2)).to.be.true;
  });

  it('should reject a rollup with signature not signed by the provider', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const { proofData, signatures, sigData } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeDistributorAddress,
        feeLimit,
      },
    );

    const feeReceiver = userAAddress.toString();
    const providerSignature = (await ethSign(userA, sigData)).signature;

    const rollupProcessorUserA = rollupProcessor.connect(userA);
    const rollupProviderAddress = await rollupProvider.getAddress();

    await expect(
      rollupProcessorUserA.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        providerSignature,
        rollupProviderAddress,
        feeReceiver,
        feeLimit,
      ),
    ).to.be.revertedWith('validateSignature: INVALID_SIGNATURE');
  });

  it('should reject a rollup from an unknown provider', async () => {
    const feeLimit = BigInt(10) ** BigInt(18);
    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
      {
        feeLimit,
        feeDistributorAddress,
      },
    );

    const providerAddress = userAAddress;
    const feeReceiver = userAAddress;
    const sigData = createSigData(proofData, providerAddress, feeLimit, feeReceiver);
    const providerSignature = (await ethSign(userA, sigData)).signature;

    const rollupProcessorUserA = rollupProcessor.connect(userA);
    const signerAddress = await userA.getAddress();

    await expect(
      rollupProcessorUserA.processRollup(
        proofData,
        solidityFormatSignatures(signatures),
        Buffer.concat(viewingKeys),
        providerSignature,
        signerAddress,
        feeReceiver.toString(),
        feeLimit,
      ),
    ).to.be.revertedWith('Rollup Processor: UNKNOWN_PROVIDER');
  });
});
