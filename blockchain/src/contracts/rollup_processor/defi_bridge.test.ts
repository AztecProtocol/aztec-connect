import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { BitConfig, BridgeId } from '@aztec/barretenberg/bridge_id';
import {
  computeInteractionHashes,
  DefiInteractionNote,
  packInteractionNotes,
} from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { Signer } from 'ethers';
import { LogDescription } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
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

describe('rollup_processor: defi bridge', () => {
  let rollupProcessor: TestRollupProcessor;
  let assets: Asset[];
  let signers: Signer[];
  let addresses: EthAddress[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

  const topupToken = async (assetId: number, amount: bigint) =>
    assets[assetId].mint(amount, rollupProcessor.address, { signingAddress: addresses[0] });

  const topupEth = async (amount: bigint) =>
    signers[0].sendTransaction({ to: rollupProcessor.address.toString(), value: Number(amount) });

  const dummyProof = () => createSendProof(0);

  const mockBridge = async (params: MockBridgeParams = {}) =>
    deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, params);

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
      ...[...Array(numberOfBridgeCalls - expectedResult.length)].map(() => DefiInteractionNote.EMPTY),
    ]);
    const hashes = await rollupProcessor.defiInteractionHashes();
    const resultHashes = [
      ...hashes,
      ...[...Array(numberOfBridgeCalls - hashes.length)].map(() => WorldStateConstants.EMPTY_INTERACTION_HASH),
    ];

    expect(expectedHashes).toEqual(resultHashes);
  };

  const expectBalance = async (assetId: number, balance: bigint) =>
    expect(await assets[assetId].balanceOf(rollupProcessor.address)).toBe(balance);

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  it('process defi interaction data that converts token to eth', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      outputAssetIdA: 0,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(1, inputValue);

    await expectBalance(1, inputValue);
    await expectBalance(0, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);

    await expectBalance(1, 0n);
    await expectBalance(0, outputValueA);
  });

  it('process defi interaction data if defiInteractionHash is 1 from max size', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      outputAssetIdA: 0,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(1, inputValue);

    await expectBalance(1, inputValue);
    await expectBalance(0, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });

    await rollupProcessor.stubTransactionHashes(1022);

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);
  });

  it('process defi interaction data that converts eth to token', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetIdA: 0,
      outputAssetIdA: 2,
      outputValueA,
    });
    const inputValue = 20n;

    await topupEth(inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(2, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 0n);
    await expectBalance(2, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process defi interaction data that converts token to token', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      outputAssetIdA: 2,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(1, inputValue);

    await expectBalance(1, inputValue);
    await expectBalance(2, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(1, 0n);
    await expectBalance(2, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process more than one defi interaction data', async () => {
    const bridge0 = await mockBridge({ inputAssetIdA: 0, outputAssetIdA: 1, outputValueA: 21n });
    const bridge1 = await mockBridge({ inputAssetIdA: 1, outputAssetIdA: 0, outputValueA: 22n });
    const bridge2 = await mockBridge({
      inputAssetIdA: 1,
      outputAssetIdA: 2,
      outputValueA: 23n,
      canConvert: false,
    });
    const bridge3 = await mockBridge({ inputAssetIdA: 2, outputAssetIdA: 1, outputValueA: 24n });

    await topupEth(100n);
    await topupToken(1, 100n);
    await topupToken(2, 100n);

    await expectBalance(0, 100n);
    await expectBalance(1, 100n);
    await expectBalance(2, 100n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [
        new DefiInteractionData(bridge0, 11n),
        new DefiInteractionData(bridge1, 12n),
        new DefiInteractionData(bridge2, 13n),
        new DefiInteractionData(bridge3, 14n),
      ],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 100n - 11n + 22n);
    await expectBalance(1, 100n - 12n + 21n + 24n);
    await expectBalance(2, 100n - 14n);

    await expectResult(
      [
        new DefiInteractionNote(bridge0, 0, 11n, 21n, 0n, true),
        new DefiInteractionNote(bridge1, 1, 12n, 22n, 0n, true),
        new DefiInteractionNote(bridge2, 2, 13n, 0n, 0n, false),
        new DefiInteractionNote(bridge3, 3, 14n, 24n, 0n, true),
      ],
      txHash,
    );
  });

  it('process defi interaction data that has two output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const bridgeId = await mockBridge({
      secondOutputAssetValid: true,
      inputAssetIdA: 1,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialTokenBalance = 50n;
    await topupToken(1, initialTokenBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialTokenBalance);
    await expectBalance(2, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, outputValueA);
    await expectBalance(1, initialTokenBalance - inputValue);
    await expectBalance(2, outputValueB);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)], txHash);
  });

  it('process defi interaction data that has two input assets and two output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const bridgeId = await mockBridge({
      secondOutputAssetValid: true,
      secondInputAssetValid: true,
      inputAssetIdA: 1,
      inputAssetIdB: 2,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialTokenBalance = 50n;
    await topupToken(1, initialTokenBalance);
    await topupToken(2, initialTokenBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialTokenBalance);
    await expectBalance(2, initialTokenBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, outputValueA);
    await expectBalance(1, initialTokenBalance - inputValue);
    await expectBalance(2, initialTokenBalance - inputValue + outputValueB);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)], txHash);
  });

  it('process defi interaction data that has two virtual input assets and two virtual output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const bridgeId = await mockBridge({
      firstOutputVirtual: true,
      secondOutputVirtual: true,
      firstInputVirtual: true,
      secondInputVirtual: true,
      inputAssetIdA: 1,
      inputAssetIdB: 2,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialTokenBalance = 50n;
    await topupToken(1, initialTokenBalance);
    await topupToken(2, initialTokenBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialTokenBalance);
    await expectBalance(2, initialTokenBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 0n); // outputs are virtual, shouldn't change token values!
    await expectBalance(1, initialTokenBalance); // input note is virtual! Shouldn't deduct from balance of inputAssetId as this token is not related to the virtual note!
    await expectBalance(2, initialTokenBalance); // output note is virtual! Shouldn't update token balance either

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)], txHash);
  });

  it('process defi interaction data that has two virtual input assets and two real output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const bridgeId = await mockBridge({
      secondOutputAssetValid: true,
      firstInputVirtual: true,
      secondInputVirtual: true,
      inputAssetIdA: 1,
      inputAssetIdB: 2,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialTokenBalance = 50n;
    await topupToken(1, initialTokenBalance);
    await topupToken(2, initialTokenBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialTokenBalance);
    await expectBalance(2, initialTokenBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, outputValueA);
    await expectBalance(1, initialTokenBalance); // input note is virtual! Shouldn't deduct from balance of inputAssetId as this token is not related to the virtual note!
    await expectBalance(2, initialTokenBalance + outputValueB); // ditto for this token too

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)], txHash);
  });

  it('process uniswap defi interaction data that converts eth to token', async () => {
    // swap ETH for DAI
    const bridgeAddressId = 1;
    const inputAssetId = 0;
    const bridgeId = new BridgeId(
      bridgeAddressId,
      inputAssetId,
      1,
      0,
      0,
      new BitConfig(false, false, false, false, false, false),
      0,
    );
    const outputValueA = 19n;
    const inputValue = 20n;

    await topupEth(inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 0n);
    await expectBalance(1, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process uniswap defi interaction data that converts token to eth', async () => {
    // swap DAI for ETH
    const bridgeAddressId = 1;
    const inputAssetId = 1;
    const bridgeId = new BridgeId(
      bridgeAddressId,
      inputAssetId,
      0,
      0,
      0,
      new BitConfig(false, false, false, false, false, false),
      0,
    );
    const outputValueA = 19n;
    // const bridgeId = await mockBridge({
    //   inputAssetId: 1,
    //   outputAssetIdA: 0,
    //   outputAssetIdB: 0,
    //   outputValueA,
    // });
    const inputValue = 20n;

    await topupToken(1, inputValue);

    await expectBalance(1, inputValue);
    await expectBalance(0, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);

    await expectBalance(1, 0n);
    await expectBalance(0, outputValueA);
  });

  it('process uniswap defi interaction data that converts eth to tokens and back', async () => {
    let previousDefiInteractionHash;
    let prevEthBalance;
    let prevDaiBalance;
    {
      // deployed uni bridges have id's of the following (from `setup_test_rollup_processor.ts`)
      // 1: ETH to DAI
      // 2: ETH to RenBTC
      // 3: DAI to ETH
      // 4: RenBTC to ETH
      const bridgeAddressId = 1;
      const inputAssetId = 0;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        1,
        0,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const outputValueA = 19n;
      const inputValue = 20n;

      await topupEth(inputValue);

      await expectBalance(0, inputValue);
      await expectBalance(1, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const interactionResult = [new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)];

      previousDefiInteractionHash = packInteractionNotes(interactionResult, numberOfBridgeCalls);

      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectBalance(0, 0n);
      await expectBalance(1, outputValueA);

      await expectResult(interactionResult, txHash);

      prevEthBalance = await assets[0].balanceOf(rollupProcessor.address);
      prevDaiBalance = await assets[1].balanceOf(rollupProcessor.address);
    }
    {
      // swap DAI for ETH
      const bridgeAddressId = 1;
      const inputAssetId = 1;
      const bridgeId = new BridgeId(
        bridgeAddressId,
        inputAssetId,
        0,
        0,
        0,
        new BitConfig(false, false, false, false, false, false),
        0,
      );
      const outputValueA = 18n;
      const inputValue = 19n;
      await expectBalance(0, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
        previousDefiInteractionHash,
        rollupId: 1,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      const currentEthBalance = await assets[0].balanceOf(rollupProcessor.address);
      const currentDaiBalance = await assets[1].balanceOf(rollupProcessor.address);

      expect(currentEthBalance === prevEthBalance).toBe(false);
      expect(currentDaiBalance === prevDaiBalance).toBe(false);

      await expectBalance(1, 0n);
      await expectResult(
        [new DefiInteractionNote(bridgeId, numberOfBridgeCalls, inputValue, outputValueA, 0n, true)],
        txHash,
      );
    }
  });

  it('fails gracefully when processing uniswap defi interaction data that converts eth to a >252-bit token', async () => {
    // swap ETH for DAI
    const outputValueA = 1n << 252n;
    const bridgeId = await mockBridge({
      inputAssetIdA: 0,
      outputAssetIdA: 1,
      outputAssetIdB: 0,
      outputValueA,
      maxTxs: 1,
    });
    const inputValue = 20n;

    await topupEth(inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, inputValue); // unchanged, because the DefiBridgeProxy should have returned success = false to the RollupProcessor.
    await expectBalance(1, 0n); // also unchanged

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)], txHash); // An interaction result which indicates failure (with zeros as output values).
  });
});
