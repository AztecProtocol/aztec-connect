// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { Asset } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { InnerProofData, RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import {
  evmSnapshot,
  evmRevert,
  advanceBlocksHardhat,
  blocksToAdvanceHardhat,
} from '../../ganache/hardhat_chain_manipulation';
import {
  createDefiDepositProof,
  createRollupProof,
  createWithdrawProof,
  DefiInteractionData,
  mergeInnerProofs,
} from './fixtures/create_mock_proof';
import { deployMockBridge, mockAsyncBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';
import { toMatchObject } from '../../mocha-checker';

describe('rollup_processor: extract async notes', () => {
  let rollupProcessor: TestRollupProcessor;
  let signers: Signer[];
  let addresses: EthAddress[];
  let assets: Asset[];
  let assetAddresses: EthAddress[];

  let snapshot: string;

  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  const txDataCallLimit = 120 * 1024;

  const mockBridge = (params: MockBridgeParams = {}) =>
    deployMockBridge(signers[0], rollupProcessor, assetAddresses, params);

  before(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers, {
      numberOfTokenAssets: 1,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
    }));
    // Advance into block region where escapeHatch is active.
    const blocks = await blocksToAdvanceHardhat(escapeBlockLowerBound, escapeBlockUpperBound, ethers.provider);
    await advanceBlocksHardhat(blocks, ethers.provider);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should correctly extract sync and async defi notes', async () => {
    const inputAssetIdA = 1;
    const outputValueA = 7n;
    const { bridgeCallData: asyncBridgeCallData } = await mockAsyncBridge(signers[0], rollupProcessor, assetAddresses, {
      inputAssetIdA,
      outputAssetIdA: 0,
      outputValueA,
    });
    const syncBridgeCallData = await mockBridge({
      inputAssetIdA,
      outputAssetIdA: 0,
      outputValueA,
    });
    const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

    const userAAddress = addresses[1];

    const depositAmount = 3000n;
    const defiDepositAmount0 = 12n;
    const withdrawalAmount = 2n;
    const asyncBatchSize = numberOfBridgeCalls;
    const syncBatchSize = numberOfBridgeCalls / 2;

    const getDefiDeposits = (count: number, bridgeCallData: BridgeCallData) => {
      return [...Array(count).fill(createDefiDepositProof(bridgeCallData, defiDepositAmount0))];
    };

    const innerProofOutputs = [
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeCallData)),
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeCallData)),
      mergeInnerProofs(getDefiDeposits(asyncBatchSize, asyncBridgeCallData)),
      mergeInnerProofs(getDefiDeposits(syncBatchSize, syncBridgeCallData)),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetIdA),
    ];

    // Deposit to contract.
    await assets[inputAssetIdA].approve(depositAmount, userAAddress, rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(inputAssetIdA, depositAmount, undefined, {
      signingAddress: userAAddress,
    });

    const createDefiInteractionData = (count: number, bridgeCallData: BridgeCallData) => {
      return [...Array(count).fill(new DefiInteractionData(bridgeCallData, defiDepositAmount0))];
    };
    let rollupId = 0;

    const txProofs = [];
    txProofs.push(
      createRollupProof(signers[0], innerProofOutputs[0], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeCallData),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      createRollupProof(signers[0], innerProofOutputs[1], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeCallData),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      createRollupProof(signers[0], innerProofOutputs[2], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(asyncBatchSize, asyncBridgeCallData),
        previousDefiInteractionHash: undefined,
      }),
    );
    txProofs.push(
      createRollupProof(signers[0], innerProofOutputs[3], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: createDefiInteractionData(syncBatchSize, syncBridgeCallData),
        previousDefiInteractionHash: undefined,
      }),
    );

    try {
      // send the first 3 txs
      for (let i = 0; i < 3; i++) {
        const txs = await rollupProcessor.createRollupTxs(
          txProofs[i].encodedProofData,
          txProofs[i].signatures,
          txProofs[i].offchainTxData,
          txDataCallLimit,
        );
        await rollupProcessor.sendRollupTxs(txs);
      }
    } catch (error) {
      console.log(error);
    }

    // now finalise the first 50 async defi deposits
    for (let i = 0; i < 50; i++) {
      await rollupProcessor.processAsyncDefiInteraction(i);
    }

    // now send the block of sync defi deposits
    {
      const txs = await rollupProcessor.createRollupTxs(
        txProofs[3].encodedProofData,
        txProofs[3].signatures,
        txProofs[3].offchainTxData,
        txDataCallLimit,
      );
      await rollupProcessor.sendRollupTxs(txs);
    }

    // the async interactions hashes are 0 to 96, the sync defi interactions are 96 to 111
    // the hashes array on the contract should now equal nonces [96 ... 111, 0 ... 50]
    // the first set of hashes selected are the last 32. e.g. [18 ... 50]
    // the next set will be [98 ... 111, 0 ... 17]
    // the final set will be [96, 97]
    const firstBatchOfNotes = Array.from(
      { length: numberOfBridgeCalls },
      (_, index) =>
        new DefiInteractionNote(asyncBridgeCallData, 18 + index, defiDepositAmount0, outputValueA, 0n, true),
    );
    const previousDefiInteractionHash1 = packInteractionNotes(firstBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      createRollupProof(signers[4], innerProofOutputs[4], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash1,
      }),
    );
    const secondBatchOfNotes = [
      ...Array.from(
        { length: 14 },
        (_, index) =>
          new DefiInteractionNote(syncBridgeCallData, 98 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
      ...Array.from(
        { length: 18 },
        (_, index) =>
          new DefiInteractionNote(asyncBridgeCallData, 0 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
    ];
    const previousDefiInteractionHash2 = packInteractionNotes(secondBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      createRollupProof(signers[5], innerProofOutputs[5], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash2,
      }),
    );
    const thirdBatchOfNotes = [
      ...Array.from(
        { length: 2 },
        (_, index) =>
          new DefiInteractionNote(syncBridgeCallData, 96 + index, defiDepositAmount0, outputValueA, 0n, true),
      ),
    ];
    const previousDefiInteractionHash3 = packInteractionNotes(thirdBatchOfNotes, numberOfBridgeCalls);
    txProofs.push(
      createRollupProof(signers[6], innerProofOutputs[6], {
        rollupId: rollupId++,
        rollupSize: 32,
        defiInteractionData: [],
        previousDefiInteractionHash: previousDefiInteractionHash3,
      }),
    );

    try {
      // now send the last 2 withdraw proofs rollups
      for (let i = 4; i < txProofs.length; i++) {
        const txs = await rollupProcessor.createRollupTxs(
          txProofs[i].encodedProofData,
          txProofs[i].signatures,
          txProofs[i].offchainTxData,
          txDataCallLimit,
        );
        await rollupProcessor.sendRollupTxs(txs);
      }
    } catch (error) {
      console.log(error);
    }

    const createPaddingProofs = (numProofs: number) => {
      return [...Array(numProofs).fill(InnerProofData.PADDING)];
    };

    let expectedRollupId = 0;

    const blocks = await rollupProcessor.getRollupBlocksFrom(0, 1);
    expect(blocks.length).to.be.eq(7);

    const numRealTxsInRollup = 32;

    // rollup 1 was the first batch of async defi deposits
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: innerProofs,
      });
    }
    expectedRollupId++;
    // rollup 2 was the second batch of async defi deposits
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: innerProofs,
      });
    }
    expectedRollupId++;
    // rollup 3 was the third batch of async defi deposits
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
        interactionResult: [],
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: innerProofs,
      });
    }
    expectedRollupId++;
    // rollup 4 was the batch of sync defi deposits
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
        interactionResult: firstBatchOfNotes,
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: [...innerProofs, ...createPaddingProofs(16)],
      });
    }
    expectedRollupId++;
    // rollup 5 was the first withdraw
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
        interactionResult: secondBatchOfNotes,
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
    expectedRollupId++;
    // rollup 6 was the second withdraw
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
        interactionResult: thirdBatchOfNotes,
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
    expectedRollupId++;
    // rollup 7 was the third withdraw
    {
      const block = blocks[expectedRollupId];
      const rollup = RollupProofData.decode(block.encodedRollupProofData);
      const { innerProofs, offchainTxData } = innerProofOutputs[expectedRollupId];
      toMatchObject(block, {
        rollupId: expectedRollupId,
        rollupSize: 32,
        offchainTxData,
        interactionResult: [],
      });
      toMatchObject(rollup, {
        rollupId: expectedRollupId,
        dataStartIndex: expectedRollupId * numRealTxsInRollup * 2,
        innerProofData: [...innerProofs, ...createPaddingProofs(31)],
      });
    }
  });
});
