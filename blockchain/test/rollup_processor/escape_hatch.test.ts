import { EthAddress } from '@aztec/barretenberg/address';
import { expect, use } from 'chai';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { solidityFormatSignatures } from '../../src/solidity_format_signatures';
import { advanceBlocks, blocksToAdvance } from '../fixtures/advance_block';
import {
  createDepositProof,
  createEscapeHatchProof,
  createRollupProof,
  createWithdrawProof,
} from '../fixtures/create_mock_proof';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

use(solidity);

describe('rollup_processor: escape hatch', () => {
  let rollupProcessor: Contract;
  let feeDistributor: Contract;
  let erc20: Contract;
  let rollupProvider: Signer;
  let userA: Signer;
  let userB: Signer;
  let userAAddress: EthAddress;
  let viewingKeys: Buffer[];
  let ethAssetId!: number;
  let erc20AssetId!: number;

  const provider = ethers.provider;
  const mintAmount = 100n;
  const depositAmount = 60n;
  const withdrawalAmount = 20n;

  beforeEach(async () => {
    [userA, userB, rollupProvider] = await ethers.getSigners();
    userAAddress = EthAddress.fromString(await userA.getAddress());
    ({ erc20, rollupProcessor, feeDistributor, viewingKeys, ethAssetId, erc20AssetId } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
    ));

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAAddress, userA),
    );
    await erc20.approve(rollupProcessor.address, depositAmount);
    await rollupProcessor.depositPendingFunds(erc20AssetId, depositAmount, userAAddress.toString());

    await rollupProcessor.escapeHatch(proofData, solidityFormatSignatures(signatures), Buffer.concat(viewingKeys));
  });

  it('should get escape hatch closed status', async () => {
    const nextEscapeBlock = await blocksToAdvance(15, 100, provider);
    await advanceBlocks(nextEscapeBlock, provider);

    const [isOpen, blocksRemaining] = await rollupProcessor.getEscapeHatchStatus();
    expect(isOpen).to.equal(false);
    expect(blocksRemaining.toNumber()).to.lessThan(81);
  });

  it('should get escape hatch open status', async () => {
    const [isOpen, blocksRemaining] = await rollupProcessor.getEscapeHatchStatus();
    expect(isOpen).to.equal(true);
    expect(blocksRemaining.toNumber()).to.be.lessThan(21);
  });

  it('should process an escape inside valid block window', async () => {
    const initialContractBalance = await erc20.balanceOf(rollupProcessor.address);
    expect(initialContractBalance).to.equal(depositAmount);
    const initialUserBalance = await erc20.balanceOf(userAAddress.toString());

    const { proofData } = await createEscapeHatchProof(
      userA,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
        dataStartIndex: 4,
      },
    );
    const nextEscapeBlock = await blocksToAdvance(80, 100, provider);
    await advanceBlocks(nextEscapeBlock, provider);
    await rollupProcessor.escapeHatch(proofData, [], Buffer.concat(viewingKeys));

    // check balances
    const finalContractBalance = await erc20.balanceOf(rollupProcessor.address);
    expect(finalContractBalance).to.equal(BigInt(initialContractBalance) - BigInt(withdrawalAmount));

    const finalUserBalance = await erc20.balanceOf(userAAddress.toString());
    expect(finalUserBalance).to.equal(BigInt(initialUserBalance) + BigInt(withdrawalAmount));
  });

  it('should reject escape hatch outside valid block window', async () => {
    const { proofData } = await createEscapeHatchProof(
      userA,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
        dataStartIndex: 4,
      },
    );
    const escapeBlock = await blocksToAdvance(101, 100, provider);
    await advanceBlocks(escapeBlock, provider);
    await expect(rollupProcessor.escapeHatch(proofData, [], Buffer.concat(viewingKeys))).to.be.revertedWith(
      'Rollup Processor: ESCAPE_BLOCK_RANGE_INCORRECT',
    );
  });

  it('should process normal proof from valid provider outside block window', async () => {
    const nextEscapeBlock = await blocksToAdvance(15, 100, provider);
    await advanceBlocks(nextEscapeBlock, provider);

    const [isOpen] = await rollupProcessor.getEscapeHatchStatus();
    expect(isOpen).to.equal(false);

    const initialUserBalance = BigInt(await erc20.balanceOf(userAAddress.toString()));

    const feeLimit = BigInt(10) ** BigInt(18);
    const prepaidFee = feeLimit;

    await feeDistributor.deposit(ethAssetId, prepaidFee, { value: prepaidFee });

    const { proofData, signatures, providerSignature } = await createRollupProof(
      rollupProvider,
      await createWithdrawProof(withdrawalAmount, userAAddress),
      {
        rollupId: 1,
        feeDistributorAddress: EthAddress.fromString(feeDistributor.address),
        feeLimit,
      },
    );

    const providerAddress = await rollupProvider.getAddress();
    await rollupProcessor.processRollup(
      proofData,
      solidityFormatSignatures(signatures),
      Buffer.concat(viewingKeys),
      providerSignature,
      providerAddress,
      providerAddress,
      feeLimit,
    );

    const postUserBalance = BigInt(await erc20.balanceOf(userAAddress.toString()));
    expect(postUserBalance).to.equal(initialUserBalance + BigInt(withdrawalAmount));
  });
});
