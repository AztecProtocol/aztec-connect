// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { virtualAssetIdFlag } from '@aztec/barretenberg/bridge_call_data';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { createPermitData, createPermitDataNonStandard } from '../../create_permit_data';
import { evmSnapshot, evmRevert } from '../../ganache/hardhat_chain_manipulation';
import { EthersAdapter } from '../../provider';
import { Web3Signer } from '../../signer';
import { createDepositProof, createRollupProof, mergeInnerProofs } from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

describe('rollup_processor: deposit', () => {
  const ethereumProvider = new EthersAdapter(ethers.provider);
  let rollupProcessor: TestRollupProcessor;
  let assets: Asset[];
  let rollupProvider: Signer;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];
  const depositAmount = 60n;
  const chainId = 31337;

  let snapshot: string;

  const RANDOM_BYTES = keccak256(toUtf8Bytes('RANDOM'));

  before(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor } = await setupTestRollupProcessor(signers));
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should deposit eth and convert to notes', async () => {
    const ethAsset = assets[0];
    await rollupProcessor.depositPendingFunds(0, depositAmount, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(0, userAddresses[0]);
      expect(userBalance).to.be.eq(depositAmount);

      const rollupBalance = await ethAsset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).to.be.eq(depositAmount);
    }

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 0),
    );

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(0, userAddresses[0]);
      expect(userBalance).to.be.eq(0n);

      const rollupBalance = await ethAsset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).to.be.eq(depositAmount);
    }
  });

  it('should deposit erc20 and convert to notes', async () => {
    const erc20Asset = assets[1];
    await erc20Asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, {
      signingAddress: userAddresses[0],
    });

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(1, userAddresses[0]);
      expect(userBalance).to.be.eq(depositAmount);

      const rollupBalance = await erc20Asset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).to.be.eq(depositAmount);
    }

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 1),
    );

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    {
      const userBalance = await rollupProcessor.getUserPendingDeposit(1, userAddresses[0]);
      expect(userBalance).to.be.eq(0n);

      const rollupBalance = await erc20Asset.balanceOf(rollupProcessor.address);
      expect(rollupBalance).to.be.eq(depositAmount);
    }
  });

  it('should process two deposits in one rollup', async () => {
    const userADepositAmount = 60n;
    const userBDepositAmount = 15n;
    const erc20A = assets[1];
    const erc20B = assets[2];

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      mergeInnerProofs([
        await createDepositProof(userADepositAmount, userAddresses[0], userSigners[0], 1),
        await createDepositProof(userBDepositAmount, userAddresses[1], userSigners[1], 2),
      ]),
    );

    await erc20A.approve(userADepositAmount, userAddresses[0], rollupProcessor.address);
    await erc20B.approve(userBDepositAmount, userAddresses[1], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, userADepositAmount, undefined, {
      signingAddress: userAddresses[0],
    });
    await rollupProcessor.depositPendingFunds(2, userBDepositAmount, undefined, {
      signingAddress: userAddresses[1],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await rollupProcessor.sendTx(tx);

    const postDepositUserABalance = await rollupProcessor.getUserPendingDeposit(1, userAddresses[0]);
    expect(postDepositUserABalance).to.be.eq(0n);

    const postDepositUserBBalance = await rollupProcessor.getUserPendingDeposit(2, userAddresses[1]);
    expect(postDepositUserBBalance).to.be.eq(0n);

    const postDepositContractBalanceA = await erc20A.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceA).to.be.eq(userADepositAmount);

    const postDepositContractBalanceB = await erc20B.balanceOf(rollupProcessor.address);
    expect(postDepositContractBalanceB).to.be.eq(userBDepositAmount);
  });

  it('should deposit funds via permit flow', async () => {
    const asset = assets[1];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      depositAmount,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    await rollupProcessor.depositPendingFundsPermit(1, depositAmount, deadline, signature, {
      signingAddress: depositor,
    });

    expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).to.be.eq(depositAmount);
    expect(await asset.getUserNonce(depositor)).to.be.eq(nonce + 1n);
  });

  it('should revert deposit funds via permit flow on behalf of someone else', async () => {
    const asset = assets[1];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      depositAmount,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    await expect(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: userAddresses[1] })
        .depositPendingFundsPermit(
          1,
          depositAmount,
          depositor.toString(),
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ).to.be.revertedWith('INVALID_SIGNATURE');

    expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).to.be.eq(0n);
    expect(await asset.getUserNonce(depositor)).to.be.eq(nonce);
  });

  it('should deposit funds via non standard permit flow', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitDataNonStandard(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    await rollupProcessor.depositPendingFundsPermitNonStandard(assetId, depositAmount, nonce, deadline, signature, {
      signingAddress: depositor,
    });

    expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).to.be.eq(depositAmount);
    expect(await asset.getUserNonce(depositor)).to.be.eq(nonce + 1n);
  });

  it('should revert deposit funds via non standard permit flow on behalf of someone else', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitDataNonStandard(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    await expect(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: userAddresses[1] })
        .depositPendingFundsPermitNonStandard(
          assetId,
          depositAmount,
          depositor.toString(),
          nonce,
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ).to.be.revertedWith('INVALID_SIGNATURE');

    expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).to.be.eq(0n);
    expect(await asset.getUserNonce(depositor)).to.be.eq(nonce);
  });

  it('should deposit funds using proof approval', async () => {
    const erc20 = assets[1];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], 1);
    const { encodedProofData } = createRollupProof(rollupProvider, innerProofData);

    await rollupProcessor.approveProof(innerProofData.innerProofs[0].txId, { signingAddress });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    expect(await rollupProcessor.getUserPendingDeposit(1, signingAddress)).to.be.eq(0n);
  });

  it('should reject deposit with bad signature', async () => {
    const erc20 = assets[1];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount, undefined, { signingAddress });

    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], 1);
    const { encodedProofData } = createRollupProof(rollupProvider, innerProofData);

    const badSignature = await new Web3Signer(ethereumProvider).signMessage(
      innerProofData.innerProofs[0].getDepositSigningData(),
      userAddresses[1],
    );

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [badSignature], []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('should reject rollup if insufficient deposit', async () => {
    const erc20Asset = assets[1];
    await erc20Asset.mint(depositAmount, userAddresses[0]);
    await erc20Asset.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(1, depositAmount - 1n, undefined, {
      signingAddress: userAddresses[0],
    });

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], 1),
    );

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INSUFFICIENT_DEPOSIT()');
  });

  it('should revert for depositing eth with inconsistent value', async () => {
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(0, 2, userAddresses[0].toString(), Buffer.alloc(32), { value: 1 }),
    ).to.be.revertedWith('WRONG_AMOUNT');
  });

  it('should revert for depositing erc20 asset with non-zero value', async () => {
    const erc20Asset = assets[1];
    await erc20Asset.approve(1n, userAddresses[0], rollupProcessor.address);
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(1, 1, userAddresses[0].toString(), Buffer.alloc(32), { value: 1 }),
    ).to.be.revertedWith('WRONG_PAYMENT_TYPE');
  });

  it('should be able to deposit eth to another address', async () => {
    const assetId = 0;
    const value = 1n;
    const depositor = userSigners[0];
    const owner = userAddresses[1];
    const proofHash = Buffer.alloc(32);
    await rollupProcessor.contract
      .connect(depositor)
      .depositPendingFunds(assetId, value, owner.toString(), proofHash, { value });
  });

  it('should be able to deposit erc20 to another address', async () => {
    const assetId = 1;
    const depositorAddress = userAddresses[0];
    const depositor = userSigners[0];
    const owner = userAddresses[1];
    const erc20 = assets[assetId];
    await erc20.approve(depositAmount, depositorAddress, rollupProcessor.address);

    const proofHash = Buffer.alloc(32);

    await rollupProcessor.contract
      .connect(depositor)
      .depositPendingFunds(assetId, depositAmount, owner.toString(), proofHash);

    expect(await rollupProcessor.getUserPendingDeposit(assetId, owner)).to.be.eq(depositAmount);
  });

  it('should revert for depositing erc20 asset without approval', async () => {
    const assetId = 1;
    const owner = userAddresses[0];
    const erc20 = assets[assetId];
    await erc20.approve(depositAmount, owner, rollupProcessor.address);

    const proofHash = Buffer.alloc(32);
    await expect(
      rollupProcessor.contract
        .connect(userSigners[1])
        .depositPendingFunds(assetId, depositAmount, owner.toString(), proofHash),
    ).to.be.revertedWith('INSUFFICIENT_TOKEN_APPROVAL');

    await rollupProcessor.contract
      .connect(userSigners[0])
      .depositPendingFunds(assetId, depositAmount, owner.toString(), proofHash);
  });

  it('should revert for depositing fund for an unknown asset', async () => {
    const unknownAssetId = 3;
    await expect(rollupProcessor.contract.getSupportedAsset(unknownAssetId)).to.be.reverted;
    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(unknownAssetId, 1, userAddresses[0].toString()),
    ).to.be.reverted;
  });

  it('should revert for depositing virtual asset', async () => {
    const tokenAssetId = 1;
    expect(await rollupProcessor.contract.getSupportedAsset(tokenAssetId)).to.be.eq(
      assets[tokenAssetId].getStaticInfo().address.toString(),
    );

    const virtualAssetId = tokenAssetId + virtualAssetIdFlag;
    await expect(rollupProcessor.contract.getSupportedAsset(virtualAssetId)).to.be.revertedWith('INVALID_ASSET_ID');

    await expect(
      rollupProcessor.contract
        .connect(userSigners[0])
        .depositPendingFunds(virtualAssetId, 1, userAddresses[0].toString(), RANDOM_BYTES),
    ).to.be.revertedWith('INVALID_ASSET_ID()');

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], virtualAssetId),
    );
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INVALID_ASSET_ID()');
  });

  it('should revert for depositing virtual asset with standard permit', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitData(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      depositAmount,
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    const virtualAssetId = assetId + virtualAssetIdFlag;
    await expect(rollupProcessor.contract.getSupportedAsset(virtualAssetId)).to.be.revertedWith('INVALID_ASSET_ID');

    await expect(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: depositor })
        .depositPendingFundsPermit(
          virtualAssetId,
          depositAmount,
          depositor.toString(),
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ).to.be.revertedWith('INVALID_ASSET_ID');

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], virtualAssetId),
    );
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INVALID_ASSET_ID()');
  });

  it('should revert for depositing virtual asset with non-standard permit', async () => {
    const assetId = 1;
    const asset = assets[assetId];
    const depositor = userAddresses[0];
    const deadline = 0xffffffffn;
    const nonce = await asset.getUserNonce(depositor);
    const name = asset.getStaticInfo().name;
    const permitData = createPermitDataNonStandard(
      name,
      depositor,
      EthAddress.fromString(rollupProcessor.permitHelper.address),
      nonce,
      deadline,
      asset.getStaticInfo().address,
      chainId,
    );
    await rollupProcessor
      .getHelperContractWithSigner({ signingAddress: depositor })
      .preApprove(asset.getStaticInfo().address.toString());

    const signer = new Web3Signer(new EthersAdapter(ethers.provider));
    const signature = await signer.signTypedData(permitData, depositor);

    const virtualAssetId = assetId + virtualAssetIdFlag;
    await expect(rollupProcessor.contract.getSupportedAsset(virtualAssetId)).to.be.revertedWith('INVALID_ASSET_ID');

    await expect(
      rollupProcessor
        .getHelperContractWithSigner({ signingAddress: depositor })
        .depositPendingFundsPermitNonStandard(
          virtualAssetId,
          depositAmount,
          depositor.toString(),
          nonce,
          deadline,
          signature.v,
          signature.r,
          signature.s,
        ),
    ).to.be.revertedWith('INVALID_ASSET_ID');

    const { encodedProofData, signatures } = createRollupProof(
      rollupProvider,
      await createDepositProof(depositAmount, userAddresses[0], userSigners[0], virtualAssetId),
    );
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, signatures, []);
    await expect(rollupProcessor.sendTx(tx)).to.be.revertedWith('INVALID_ASSET_ID()');
  });

  it('should allow depositing to a proof hash', async () => {
    const erc20 = assets[1];
    const signingAddress = userAddresses[0];

    await erc20.approve(depositAmount, userAddresses[0], rollupProcessor.address);
    const innerProofData = await createDepositProof(depositAmount, signingAddress, userSigners[0], 1);
    const txId = innerProofData.innerProofs[0].txId;
    await rollupProcessor.depositPendingFunds(1, depositAmount, txId, { signingAddress });

    const { encodedProofData } = createRollupProof(rollupProvider, innerProofData);

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    expect(await rollupProcessor.getProofApprovalStatus(signingAddress, txId)).to.be.eq(true);
    expect(await rollupProcessor.getUserPendingDeposit(1, signingAddress)).to.be.eq(0n);
  });
});
