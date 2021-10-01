import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createPermitData } from '../../create_permit_data';
import { EthersAdapter } from '../../provider';
import { Web3Signer } from '../../signer';
import { createDepositProof, createRollupProof, mergeInnerProofs } from './fixtures/create_mock_proof';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: deposit', () => {
  const ethereumProvider = new EthersAdapter(ethers.provider);
  let rollupProcessor: RollupProcessor;
  let assets: Asset[];
  let rollupProvider: Signer;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;

  beforeEach(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor } = await setupRollupProcessor(signers, 2));
  });

  it('should deposit eth and convert to notes', async () => {
    const ethAsset = assets[AssetId.ETH];
    await rollupProcessor.depositPendingFunds(AssetId.ETH, depositAmount, undefined, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(AssetId.ETH, userAddresses[0]);
      expect(userBalance).toBe(depositAmount);

      const rollupBalance = await ethAsset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.ETH),
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(AssetId.ETH, userAddresses[0]);
      expect(userBalance).toBe(0n);

      const rollupBalance = await ethAsset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }
  });

  it('should deposit erc20 and convert to notes', async () => {
    const erc20Asset = assets[AssetId.DAI];
    await erc20Asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(AssetId.DAI, userAddresses[0]);
      expect(userBalance).toBe(depositAmount);

      const rollupBalance = await erc20Asset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.DAI),
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(AssetId.DAI, userAddresses[0]);
      expect(userBalance).toBe(0n);

      const rollupBalance = await erc20Asset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).toBe(depositAmount);
    }
  });

  it('should process two deposits in one rollup', async () => {
    const userADepositAmount = 60n;
    const userBDepositAmount = 15n;
    const erc20A = assets[AssetId.DAI];
    const erc20B = assets[AssetId.renBTC];

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      mergeInnerProofs([
        await createDepositProof(userADepositAmount, userAddresses[0], userSigners[0], AssetId.DAI),
        await createDepositProof(userBDepositAmount, userAddresses[1], userSigners[1], AssetId.renBTC),
      ]),
    );

    await erc20A.approve(userADepositAmount, userAddresses[0], rollupProcessor.address);
    await erc20B.approve(userBDepositAmount, userAddresses[1], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, userADepositAmount, undefined, undefined, {
      signingAddress: userAddresses[0],
    });
    await rollupProcessor.depositPendingFunds(AssetId.renBTC, userBDepositAmount, undefined, undefined, {
      signingAddress: userAddresses[1],
    });

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postDepositUserABalance = await rollupProcessor.getUserPendingDeposit(AssetId.DAI, userAddresses[0]);
    expect(postDepositUserABalance).toBe(0n);

    const postDepositUserBBalance = await rollupProcessor.getUserPendingDeposit(AssetId.renBTC, userAddresses[1]);
    expect(postDepositUserBBalance).toBe(0n);

    const postDepositContractBalanceA = await erc20A.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceA).toBe(userADepositAmount);

    const postDepositContractBalanceB = await erc20B.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceB).toBe(userBDepositAmount);
  });

  it('should deposit funds via permit flow', async () => {
    const asset = assets[AssetId.DAI];
    const userAddress = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(userAddresses[0]);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      userAddress,
      rollupProcessor.address,
      depositAmount,
      nonce,
      deadline,
      31337,
      asset.getStaticInfo().address,
    );
    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, userAddress);
    const permitArgs = { deadline, approvalAmount: depositAmount, signature };

    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, permitArgs, {
      signingAddress: userAddress,
    });

    expect(await rollupProcessor.getUserPendingDeposit(AssetId.DAI, userAddress)).toBe(depositAmount);
    expect(await asset.getUserNonce(userAddress)).toBe(1n);
  });

  it('should deposit funds using proof approval', async () => {
    const erc20 = assets[AssetId.DAI];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], AssetId.DAI);
    const { proofData } = await createRollupProof(rollupProvider, innerProofData);

    await rollupProcessor.approveProof(innerProofData.innerProofs[0].txId, { signingAddress });

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    expect(await rollupProcessor.getUserPendingDeposit(AssetId.DAI, signingAddress)).toBe(0n);
  });

  it('should reject deposit with bad signature', async () => {
    const erc20 = assets[AssetId.DAI];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, undefined, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], AssetId.DAI);
    const { proofData } = await createRollupProof(rollupProvider, innerProofData);

    const badSignature = await new Web3Signer(ethereumProvider).signMessage(
      innerProofData.innerProofs[0].getDepositSigningData(),
      userAddresses[1],
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [badSignature], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('validateUnpackedSignature: INVALID_SIGNATURE');
  });

  it('should reject rollup if insufficient deposit', async () => {
    const erc20Asset = assets[AssetId.DAI];
    await erc20Asset.mint(depositAmount, userAddresses[0]);
    await erc20Asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount - 1n, undefined, undefined, {
      signingAddress: userAddresses[0],
    });

    const { proofData, signatures } = await createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], AssetId.DAI),
    );

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INSUFFICIENT_DEPOSIT');
  });

  it('should revert for depositing eth with inconsistent value', async () => {
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(AssetId.ETH, 2, userAddresses[0].toString(), Buffer.alloc(32), { value: 1 }),
    ).rejects.toThrow('Rollup Processor: WRONG_AMOUNT');
  });

  it('should revert for depositing erc20 asset with non-zero value', async () => {
    const erc20Asset = assets[AssetId.DAI];
    await erc20Asset.approve(1n, userAddresses[0], rollupProcessor.address);
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(AssetId.DAI, 1, userAddresses[0].toString(), Buffer.alloc(32), { value: 1 }),
    ).rejects.toThrow('Rollup Processor: WRONG_PAYMENT_TYPE');
  });

  it('should revert for depositing fund for an unknown asset', async () => {
    const unknownAssetId = 3;
    await expect(rollupProcessor.contract.getSupportedAsset(unknownAssetId)).rejects.toThrow();
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(unknownAssetId, 1, userAddresses[0].toString()),
    ).rejects.toThrow();
  });

  it('should allow depositing to a proof hash', async () => {
    const erc20 = assets[AssetId.DAI];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], AssetId.DAI);
    const txId = innerProofData.innerProofs[0].txId;
    await rollupProcessor.depositPendingFunds(AssetId.DAI, depositAmount, txId, undefined, { signingAddress });

    const { proofData } = await createRollupProof(rollupProvider, innerProofData);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    expect(await rollupProcessor.getUserPendingDeposit(AssetId.DAI, signingAddress)).toBe(0n);
  });
});
