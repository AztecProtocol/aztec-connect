import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { AUX_DATA, BridgeId } from '@aztec/barretenberg/bridge_id';
import {
  computeInteractionHashes,
  DefiInteractionNote,
  packInteractionNotes,
} from '@aztec/barretenberg/note_algorithms';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Signer } from 'ethers';
import { LogDescription } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { EthersAdapter } from '../../provider';
import { DefiBridge } from '../defi_bridge';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

const parseInteractionResultFromLog = (log: LogDescription) => {
  const {
    args: { bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result },
  } = log;
  return new DefiInteractionNote(
    BridgeId.fromBigInt(BigInt(bridgeId)),
    nonce.toNumber(),
    BigInt(totalInputValue),
    BigInt(totalOutputValueA),
    BigInt(totalOutputValueB),
    result,
  );
};

describe('rollup_processor: defi bridge with loans', () => {
  let rollupProcessor: TestRollupProcessor;
  let assets: Asset[];
  let signers: Signer[];
  let addresses: EthAddress[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const topupToken = async (assetId: AssetId, amount: bigint) =>
    assets[assetId].mint(amount, rollupProcessor.address, { signingAddress: addresses[0] });

  const topupEth = async (amount: bigint) =>
    signers[0].sendTransaction({ to: rollupProcessor.address.toString(), value: Number(amount) });

  const dummyProof = () => createSendProof(AssetId.ETH);

  const mockBridge = async (params: MockBridgeParams = {}) => {
    const bridgeId = await deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, {
      ...params,
    });
    const bridgeAddress = await rollupProcessor.getSupportedBridge(bridgeId.address);
    const bridge = new DefiBridge(bridgeAddress, new EthersAdapter(ethers.provider));
    const contract = await ethers.getContractAt('MockDefiBridge', bridgeAddress.toString());
    return { bridgeId, bridge, contract };
  };

  const expectResult = async (expectedResult: DefiInteractionNote[], txHash: TxHash) => {
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const interactionResult = receipt.logs
      .filter(l => l.address === rollupProcessor.address.toString())
      .map(l => rollupProcessor.contract.interface.parseLog(l))
      .filter(e => e.eventFragment.name === 'DefiBridgeProcessed')
      .map(parseInteractionResultFromLog);
    expect(interactionResult.length).toBe(expectedResult.length);
    for (let i = 0; i < expectedResult.length; ++i) {
      expect(interactionResult[i]).toEqual(expectedResult[i]);
    }

    const expectedHashes = computeInteractionHashes([
      ...expectedResult,
      ...[...Array(4 - expectedResult.length)].map(() => DefiInteractionNote.EMPTY),
    ]);
    const hashes = await rollupProcessor.defiInteractionHashes();
    const resultHashes = [
      ...hashes,
      ...[...Array(4 - hashes.length)].map(() => WorldStateConstants.EMPTY_INTERACTION_HASH),
    ];

    expect(expectedHashes).toEqual(resultHashes);
  };

  const expectBalance = async (assetId: AssetId, balance: bigint) =>
    expect(await assets[assetId].balanceOf(rollupProcessor.address)).toBe(balance);

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  it('process defi interaction data that draws and repays a loan', async () => {
    const inputValue = 20n;
    const outputValueA = 10n;
    const outputValueB = 7n;
    const { bridgeId } = await mockBridge({
      secondAssetValid: true,
      secondAssetVirtual: true,
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.ETH,
      outputAssetIdB: AssetId.renBTC,
      outputValueA,
      outputValueB,
    });

    const initialTokenBalance = 50n;
    await topupToken(AssetId.DAI, initialTokenBalance);

    await expectBalance(AssetId.ETH, 0n);
    await expectBalance(AssetId.DAI, initialTokenBalance);
    await expectBalance(AssetId.renBTC, 0n);

    // Empty rollup to ensure defi_interaction_nonce > 0 while drawing a loan
    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof());
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    // Drawing a loan in ETH against DAI as collateral
    let previousDefiInteractionHash: Buffer;
    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectBalance(AssetId.ETH, outputValueA);
      await expectBalance(AssetId.DAI, initialTokenBalance - inputValue);
      await expectBalance(AssetId.renBTC, outputValueB);

      const interactionResult = [new DefiInteractionNote(bridgeId, 4, inputValue, outputValueA, outputValueB, true)];
      await expectResult(interactionResult, txHash);
      previousDefiInteractionHash = packInteractionNotes(interactionResult, 4);
    }

    // Repay the loan (ETH) and get back collateral (DAI) after subtracting interest
    // Note that we need a new bridge id as the input and output assets have changed
    {
      const { bridgeId: bridgeId2, contract: bridge2 } = await mockBridge({
        secondAssetValid: true,
        secondAssetVirtual: true,
        inputAssetId: AssetId.ETH,
        outputAssetIdA: AssetId.DAI,
        outputAssetIdB: AssetId.renBTC,
        outputValueA: inputValue,
        outputValueB: BigInt(0),
        openingNonce: 4,
        auxData: AUX_DATA.CLOSE_LOAN,
      });
      await bridge2.recordInterestRate(4, 10); // interest rate = 10 %

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 2,
        defiInteractionData: [new DefiInteractionData(bridgeId2, outputValueA)],
        previousDefiInteractionHash,
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      const inputValueETH = outputValueA;
      const outputValueDAI = inputValue - (inputValue * BigInt(1)) / BigInt(10);

      const interactionResult = [new DefiInteractionNote(bridgeId2, 8, inputValueETH, outputValueDAI, BigInt(0), true)];
      await expectResult(interactionResult, txHash);

      await expectBalance(AssetId.ETH, BigInt(0));
      await expectBalance(AssetId.DAI, initialTokenBalance - (inputValue * BigInt(1)) / BigInt(10));
      await expectBalance(AssetId.renBTC, outputValueB);
    }
  });

  it('process defi interaction data that draws and repays multiple loans', async () => {
    const collateralValue1 = 100n;
    const loanValue1 = 10n;
    const { bridgeId: bridgeId1 } = await mockBridge({
      secondAssetVirtual: true,
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.ETH,
      outputValueA: loanValue1,
    });

    const collateralValue2 = 20n;
    const loanValue2 = 4n;
    const { bridgeId: bridgeId2 } = await mockBridge({
      secondAssetVirtual: true,
      inputAssetId: AssetId.ETH,
      outputAssetIdA: AssetId.renBTC,
      outputValueA: loanValue2,
    });

    const initialTokenBalance = 200n;
    const initialEthBalance = 40n;
    await topupToken(AssetId.DAI, initialTokenBalance);
    await topupEth(initialEthBalance);

    await expectBalance(AssetId.ETH, initialEthBalance);
    await expectBalance(AssetId.DAI, initialTokenBalance);
    await expectBalance(AssetId.renBTC, 0n);

    // Empty rollup to ensure defi_interaction_nonce > 0 while drawing a loan
    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof());
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    // Drawing two loans: (DAI -> ETH) and (ETH -> renBTC)
    let previousDefiInteractionHash: Buffer;
    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [
          new DefiInteractionData(bridgeId1, collateralValue1),
          new DefiInteractionData(bridgeId2, collateralValue2),
        ],
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectBalance(AssetId.ETH, initialEthBalance - collateralValue2 + loanValue1);
      await expectBalance(AssetId.DAI, initialTokenBalance - collateralValue1);
      await expectBalance(AssetId.renBTC, loanValue2);

      const interactionResult = [
        new DefiInteractionNote(bridgeId1, 4, collateralValue1, loanValue1, 0n, true),
        new DefiInteractionNote(bridgeId2, 5, collateralValue2, loanValue2, 0n, true),
      ];
      await expectResult(interactionResult, txHash);
      previousDefiInteractionHash = packInteractionNotes(interactionResult, 4);
    }

    // Repay the two loans after subtracting 10% and 20% interests respectively
    // Note that we need new bridge ids as the input and output assets have changed
    {
      const { bridgeId: repayBridgeId1, contract: repayBridge1 } = await mockBridge({
        secondAssetVirtual: true,
        inputAssetId: AssetId.ETH,
        outputAssetIdA: AssetId.DAI,
        outputValueA: collateralValue1,
        openingNonce: 4,
        auxData: AUX_DATA.CLOSE_LOAN,
      });
      await repayBridge1.recordInterestRate(4, 10); // interest rate = 10 %

      const { bridgeId: repayBridgeId2, contract: repayBridge2 } = await mockBridge({
        secondAssetVirtual: true,
        inputAssetId: AssetId.renBTC,
        outputAssetIdA: AssetId.ETH,
        outputValueA: collateralValue2,
        openingNonce: 5,
        auxData: AUX_DATA.CLOSE_LOAN,
      });
      await repayBridge2.recordInterestRate(5, 20); // interest rate = 20 %

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 2,
        defiInteractionData: [
          new DefiInteractionData(repayBridgeId1, loanValue1),
          new DefiInteractionData(repayBridgeId2, loanValue2),
        ],
        previousDefiInteractionHash,
      });
      const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      const collateralReturned1 = (collateralValue1 * BigInt(9)) / BigInt(10);
      const collateralReturned2 = (collateralValue2 * BigInt(8)) / BigInt(10);
      const interactionResult = [
        new DefiInteractionNote(repayBridgeId1, 8, loanValue1, collateralReturned1, BigInt(0), true),
        new DefiInteractionNote(repayBridgeId2, 9, loanValue2, collateralReturned2, BigInt(0), true),
      ];
      await expectResult(interactionResult, txHash);

      await expectBalance(AssetId.ETH, initialEthBalance - (collateralValue2 * BigInt(2)) / BigInt(10));
      await expectBalance(AssetId.DAI, initialTokenBalance - (collateralValue1 * BigInt(1)) / BigInt(10));
      await expectBalance(AssetId.renBTC, BigInt(0));
    }
  });
});
