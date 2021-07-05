import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { expect, use } from 'chai';
import { randomBytes } from 'crypto';
import { solidity } from 'ethereum-waffle';
import { Contract, Signer, utils } from 'ethers';
import { ethers } from 'hardhat';
import { TokenAsset } from '../fixtures/assets';
import { createRollupProof, createSendProof, DefiInteractionData } from '../fixtures/create_mock_proof';
import { DefiBridge, deployMockDefiBridge } from '../fixtures/setup_defi_bridges';
import { setupRollupProcessor } from '../fixtures/setup_rollup_processor';

use(solidity);

const IDefiBridgeEvent = new utils.Interface([
  'event DefiBridgeProcessed(uint256 indexed bridgeId, uint256 indexed nonce, uint256 totalInputValue, uint256 totalOutputValueA, uint256 totalOutputValueB, bool result)',
]);

const parseInteractionResultFromLog = (log: { topics: string[]; data: string }) => {
  const {
    args: { bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result },
  } = IDefiBridgeEvent.parseLog(log);
  return new DefiInteractionNote(
    BridgeId.fromBigInt(BigInt(bridgeId)),
    nonce,
    BigInt(totalInputValue),
    BigInt(totalOutputValueA),
    BigInt(totalOutputValueB),
    result,
  );
};

describe('rollup_processor: defi bridge', () => {
  let rollupProcessor: Contract;
  let tokenAssets: TokenAsset[];
  let uniswapBridges: { [key: number]: DefiBridge }[];
  let userA: Signer;
  let userB: Signer;
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const mintAmount = 100n;

  const topupToken = async (asset: TokenAsset, amount: bigint) => asset.contract.mint(rollupProcessor.address, amount);

  const topupEth = async (amount: bigint, account = userA) =>
    account.sendTransaction({ to: rollupProcessor.address, value: Number(amount) });

  const dummyProof = () => createSendProof(AssetId.ETH);

  const mockBridge = async (
    { numOutputAssets, inputAssetId, outputAssetIdA, outputAssetIdB }: Partial<BridgeId>,
    minInputValue = 0n,
    outputValueA = 0n,
    outputValueB = 0n,
    topup = true,
    topupValue?: bigint,
  ) => {
    numOutputAssets = numOutputAssets !== undefined ? numOutputAssets : 1;
    inputAssetId = inputAssetId !== undefined ? inputAssetId : AssetId.ETH;
    outputAssetIdA = outputAssetIdA !== undefined ? outputAssetIdA : AssetId.DAI;
    const outputAssetB = outputAssetIdB !== undefined ? assetAddresses[outputAssetIdB] : EthAddress.ZERO;
    const bridge = await deployMockDefiBridge(
      rollupProvider,
      numOutputAssets,
      assetAddresses[inputAssetId],
      assetAddresses[outputAssetIdA],
      outputAssetB,
      minInputValue,
      outputValueA,
      outputValueB,
      topup,
      topupValue,
    );
    return new BridgeId(
      EthAddress.fromString(bridge.address),
      numOutputAssets,
      inputAssetId,
      outputAssetIdA,
      outputAssetIdB || 0,
    );
  };

  const expectResult = async (expectedResult: DefiInteractionNote[], receipt: any) => {
    const interactionResult = receipt.events
      .filter((e: any) => e.event === 'DefiBridgeProcessed')
      .map(parseInteractionResultFromLog);
    expect(interactionResult.length).to.equal(expectedResult.length);
    for (let i = 0; i < expectedResult.length; ++i) {
      expect(expectedResult[i].equals(interactionResult[i])).to.equal(true);
    }

    const expectedHash = packInteractionNotes([
      ...expectedResult,
      ...[...Array(4 - expectedResult.length)].map(() => DefiInteractionNote.EMPTY),
    ]);
    expect(await rollupProcessor.defiInteractionHash()).to.equal(`0x${expectedHash.toString('hex')}`);
  };

  const expectBalance = async (assetId: number, balance: bigint) => {
    if (assetId === AssetId.ETH) {
      expect(await rollupProvider.provider!.getBalance(rollupProcessor.address)).to.equal(balance);
    } else {
      const asset = tokenAssets.find(a => a.id === assetId)!;
      expect(await asset.contract.balanceOf(rollupProcessor.address)).to.equal(balance);
    }
  };

  const expectRefund = async (bridgeId: BridgeId, inputValue: bigint, receipt: any) => {
    await expectBalance(bridgeId.inputAssetId, inputValue);
    await expectBalance(bridgeId.outputAssetIdA, 0n);
    if (bridgeId.numOutputAssets > 1) {
      await expectBalance(bridgeId.outputAssetIdB, 0n);
    }
    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)], receipt);
  };

  beforeEach(async () => {
    [rollupProvider, userA, userB] = await ethers.getSigners();
    ({ rollupProcessor, tokenAssets, assetAddresses, uniswapBridges } = await setupRollupProcessor(
      rollupProvider,
      [userA, userB],
      mintAmount,
      2,
    ));
  });

  describe('Defi bridge', async () => {
    it('process defi interaction data that converts token to eth', async () => {
      const asset = tokenAssets[0];
      const bridge = uniswapBridges[asset.id][AssetId.ETH];
      const inputValue = 20n;
      const expectedOutputValue = 19n;

      await topupToken(asset, inputValue);

      await expectBalance(asset.id, inputValue);
      await expectBalance(AssetId.ETH, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridge.id, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectBalance(asset.id, 0n);
      await expectBalance(AssetId.ETH, expectedOutputValue);

      await expectResult([new DefiInteractionNote(bridge.id, 0, inputValue, expectedOutputValue, 0n, true)], receipt);
    });

    it('process defi interaction data that converts eth to token', async () => {
      const asset = tokenAssets[0];
      const bridge = uniswapBridges[AssetId.ETH][asset.id];
      const inputValue = 20n;
      const expectedOutputValue = 19n;

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(asset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridge.id, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectBalance(asset.id, expectedOutputValue);
      await expectBalance(AssetId.ETH, 0n);

      await expectResult([new DefiInteractionNote(bridge.id, 0, inputValue, expectedOutputValue, 0n, true)], receipt);
    });

    it('process more than one defi interaction data', async () => {
      await topupEth(60n);
      await topupToken(tokenAssets[0], 100n);
      await topupToken(tokenAssets[1], 80n);

      await expectBalance(AssetId.ETH, 60n);
      await expectBalance(tokenAssets[0].id, 100n);
      await expectBalance(tokenAssets[1].id, 80n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [
          new DefiInteractionData(uniswapBridges[tokenAssets[0].id][AssetId.ETH].id, 78n),
          new DefiInteractionData(uniswapBridges[tokenAssets[1].id][AssetId.ETH].id, 56n),
          new DefiInteractionData(uniswapBridges[AssetId.ETH][tokenAssets[0].id].id, 34n),
          new DefiInteractionData(uniswapBridges[AssetId.ETH][tokenAssets[1].id].id, 12n),
        ],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectBalance(AssetId.ETH, 60n - 12n - 34n + 55n + 77n);
      await expectBalance(tokenAssets[0].id, 100n - 78n + 33n);
      await expectBalance(tokenAssets[1].id, 80n - 56n + 11n);

      await expectResult(
        [
          new DefiInteractionNote(uniswapBridges[tokenAssets[0].id][AssetId.ETH].id, 0, 78n, 77n, 0n, true),
          new DefiInteractionNote(uniswapBridges[tokenAssets[1].id][AssetId.ETH].id, 1, 56n, 55n, 0n, true),
          new DefiInteractionNote(uniswapBridges[AssetId.ETH][tokenAssets[0].id].id, 2, 34n, 33n, 0n, true),
          new DefiInteractionNote(uniswapBridges[AssetId.ETH][tokenAssets[1].id].id, 3, 12n, 11n, 0n, true),
        ],
        receipt,
      );
    });

    it('process defi interaction data that has two output assets', async () => {
      const inputAsset = tokenAssets[0];
      const inputValue = 20n;
      const outputAssetB = tokenAssets[1];
      const expectedOutputValueA = 12n;
      const expectedOutputValueB = 7n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 2,
          inputAssetId: inputAsset.id,
          outputAssetIdA: AssetId.ETH,
          outputAssetIdB: outputAssetB.id,
        },
        0n,
        expectedOutputValueA,
        expectedOutputValueB,
      );

      const initialTokenBalance = 50n;
      await topupToken(inputAsset, initialTokenBalance);

      await expectBalance(AssetId.ETH, 0n);
      await expectBalance(inputAsset.id, initialTokenBalance);
      await expectBalance(outputAssetB.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectBalance(AssetId.ETH, expectedOutputValueA);
      await expectBalance(inputAsset.id, initialTokenBalance - inputValue);
      await expectBalance(outputAssetB.id, expectedOutputValueB);

      await expectResult(
        [new DefiInteractionNote(bridgeId, 0, inputValue, expectedOutputValueA, expectedOutputValueB, true)],
        receipt,
      );
    });

    it('process failed defi interaction that converts token to eth', async () => {
      const minInputValue = 20n;
      const inputValue = minInputValue - 1n;
      const inputAsset = tokenAssets[0];
      const cloneFromBridge = uniswapBridges[inputAsset.id][AssetId.ETH];
      const bridgeId = await mockBridge({ ...cloneFromBridge.id, outputAssetIdB: undefined }, minInputValue);

      await topupToken(inputAsset, inputValue);

      await expectBalance(inputAsset.id, inputValue);
      await expectBalance(AssetId.ETH, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction that converts eth to token', async () => {
      const minInputValue = 20n;
      const inputValue = minInputValue - 1n;
      const outputAsset = tokenAssets[0];
      const cloneFromBridge = uniswapBridges[AssetId.ETH][outputAsset.id];
      const bridgeId = await mockBridge({ ...cloneFromBridge.id, outputAssetIdB: undefined }, minInputValue);

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAsset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction that did not transfer any output token to rollup processor', async () => {
      const inputValue = 10n;
      const outputAsset = tokenAssets[0];
      const expectedOutputValueA = 12n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 1,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAsset.id,
        },
        0n,
        expectedOutputValueA,
        0n,
        false, // Do not topup the bridge so that there won't be enough balance to transfer to rollup processor.
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAsset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction that did not transfer enough output token A to rollup processor', async () => {
      const inputValue = 10n;
      const outputAsset = tokenAssets[0];
      const expectedOutputValueA = 12n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 1,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAsset.id,
        },
        0n,
        expectedOutputValueA,
        0n,
        true,
        expectedOutputValueA - 1n, // Only transfer 11n tokenA back to rollup processor.
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAsset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction that did not transfer enough output token B to rollup processor', async () => {
      const inputValue = 10n;
      const outputAssetA = tokenAssets[0];
      const outputAssetB = tokenAssets[1];
      const expectedOutputValueA = 12n;
      const expectedOutputValueB = 13n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 2,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAssetA.id,
          outputAssetIdB: outputAssetB.id,
        },
        0n,
        expectedOutputValueA,
        expectedOutputValueB,
        true,
        12n, // Transfer 12n tokenA and 12n tokenB back to rollup processor.
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAssetA.id, 0n);
      await expectBalance(outputAssetB.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction from a bridge that has one output asset and returns zero outputValueA', async () => {
      const inputValue = 10n;
      const outputAsset = tokenAssets[0];
      const outputValueA = 0n;
      const outputValueB = 0n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 1,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAsset.id,
        },
        0n,
        outputValueA,
        outputValueB,
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAsset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction from a bridge that has one output asset and only returns outputValueB', async () => {
      const inputValue = 10n;
      const outputAsset = tokenAssets[0];
      const outputValueA = 0n;
      const outputValueB = 2n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 1,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAsset.id,
        },
        0n,
        outputValueA,
        outputValueB,
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAsset.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('process failed defi interaction from a bridge that has two output assets and returns empty output values', async () => {
      const inputValue = 10n;
      const outputAssetA = tokenAssets[0];
      const outputAssetB = tokenAssets[1];
      const outputValueA = 0n;
      const outputValueB = 0n;
      const bridgeId = await mockBridge(
        {
          numOutputAssets: 2,
          inputAssetId: AssetId.ETH,
          outputAssetIdA: outputAssetA.id,
          outputAssetIdB: outputAssetB.id,
        },
        0n,
        outputValueA,
        outputValueB,
      );

      await topupEth(inputValue);

      await expectBalance(AssetId.ETH, inputValue);
      await expectBalance(outputAssetA.id, 0n);
      await expectBalance(outputAssetB.id, 0n);

      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.escapeHatch(proofData, [], []);
      const receipt = await tx.wait();

      await expectRefund(bridgeId, inputValue, receipt);
    });

    it('revert if prev defiInteraction hash is wrong', async () => {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        previousDefiInteractionHash: randomBytes(32),
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INCORRECT_PREV_DEFI_INTERACTION_HASH',
      );
    });

    it('revert if total input value is empty', async () => {
      const bridgeId = uniswapBridges[tokenAssets[0].id][AssetId.ETH].id;
      const inputValue = 0n;
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: ZERO_TOTAL_INPUT_VALUE',
      );
    });
  });

  describe('bridge id', () => {
    const cloneId = (
      { address, numOutputAssets, inputAssetId, outputAssetIdA, outputAssetIdB }: Partial<BridgeId> = {},
      bridgeId = uniswapBridges[tokenAssets[0].id][AssetId.ETH].id,
    ) => {
      return new BridgeId(
        address || bridgeId.address,
        numOutputAssets !== undefined ? numOutputAssets : bridgeId.numOutputAssets,
        inputAssetId !== undefined ? inputAssetId : bridgeId.inputAssetId,
        outputAssetIdA !== undefined ? outputAssetIdA : bridgeId.outputAssetIdA,
        outputAssetIdB !== undefined ? outputAssetIdB : bridgeId.outputAssetIdB,
      );
    };

    it('revert if bridge address does not exist', async () => {
      const bridgeId = cloneId({ address: EthAddress.randomAddress() });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });

    it('revert if number of output assets do not match', async () => {
      const bridgeId = cloneId({ numOutputAssets: 2 });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });

    it('revert if number of output assets is zero', async () => {
      const bridgeId = cloneId({ numOutputAssets: 0 });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: ZERO_NUM_OUTPUT_ASSETS',
      );
    });

    it('revert if input asset addresses do not match', async () => {
      const bridgeId = cloneId({ inputAssetId: AssetId.ETH });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });

    it('revert if first output asset addresses do not match', async () => {
      const bridgeId = cloneId({ outputAssetIdA: AssetId.DAI });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });

    it('revert if second output asset addresses do not match', async () => {
      const bridgeId = await mockBridge({ numOutputAssets: 2, outputAssetIdB: AssetId.ETH });
      const invalidBridgeId = cloneId({ outputAssetIdB: AssetId.DAI }, bridgeId);
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(invalidBridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });

    it('revert if a bridge contract with one output asset returns a non zero second output asset address', async () => {
      const bridgeId = await mockBridge({
        numOutputAssets: 1,
        inputAssetId: AssetId.ETH,
        outputAssetIdA: AssetId.DAI,
        outputAssetIdB: AssetId.DAI,
      });
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, 1n)],
      });
      await expect(rollupProcessor.escapeHatch(proofData, [], [])).to.be.revertedWith(
        'Rollup Processor: INVALID_BRIDGE_ID',
      );
    });
  });
});
