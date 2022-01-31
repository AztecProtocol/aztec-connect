import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import {
  computeInteractionHashes,
  DefiInteractionNote,
  packInteractionNotes,
} from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
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

describe('rollup_processor: async defi bridge', () => {
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

  const dummyProof = () => createSendProof();

  const mockAsyncBridge = async (params: MockBridgeParams = {}) => {
    const bridgeId = await deployMockBridge(rollupProvider, rollupProcessor, assetAddresses, {
      ...params,
      isAsync: true,
    });
    const bridgeAddress = await rollupProcessor.getSupportedBridge(bridgeId.addressId);
    const bridge = new DefiBridge(bridgeAddress, new EthersAdapter(ethers.provider));
    return { bridgeId, bridge };
  };

  const fetchResult = async (txHash: TxHash, eventName = 'DefiBridgeProcessed') => {
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    return receipt.logs
      .filter(l => l.address === rollupProcessor.address.toString())
      .map(l => rollupProcessor.contract.interface.parseLog(l))
      .filter(e => e.eventFragment.name === eventName)
      .map(parseInteractionResultFromLog);
  };

  const expectHashes = async (expectedResult: DefiInteractionNote[]) => {
    const expectedHashes = computeInteractionHashes(expectedResult);
    expect(await rollupProcessor.defiInteractionHashes()).toEqual(expectedHashes);
  };

  const expectAsyncHashes = async (expectedResult: DefiInteractionNote[]) => {
    const expectedHashes = computeInteractionHashes(expectedResult);
    expect(await rollupProcessor.asyncDefiInteractionHashes()).toEqual(expectedHashes);
  };

  const expectResult = async (txHash: TxHash, expectedResult: DefiInteractionNote[]) => {
    expect(await fetchResult(txHash)).toEqual(expectedResult);
  };

  const expectAsyncResult = async (txHash: TxHash, expectedResult: DefiInteractionNote[]) => {
    expect(await fetchResult(txHash, 'AsyncDefiBridgeProcessed')).toEqual(expectedResult);
  };

  const expectBalance = async (assetId: number, balance: bigint) =>
    expect(await assets[assetId].balanceOf(rollupProcessor.address)).toBe(balance);

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  it('process defi interaction data that has two output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      secondOutputAssetValid: true,
      inputAssetId: 1,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);

      const expectedAsyncResult = [new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)];
      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncResult(txHash, expectedAsyncResult);
      await expectAsyncHashes(expectedAsyncResult);

      await expectBalance(0, outputValueA);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, outputValueB);
    }

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);
    }
  });

  it('process multiple async defi interactions', async () => {
    const outputValueA = 12n;
    const outputValueB = 7n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      secondOutputAssetValid: true,
      inputAssetId: 1,
      outputAssetIdA: 0,
      outputAssetIdB: 2,
      outputValueA,
      outputValueB,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    const numAsyncInteractions = numberOfBridgeCalls + 3;
    let rollupId = 0;

    // convert
    let totalInputValue = 0n;
    for (let i = 0; i < numAsyncInteractions; ++i) {
      const interactionNonce = i * numberOfBridgeCalls;
      const inputValue = BigInt(i + 1);
      totalInputValue += inputValue;
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId,
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);
      rollupId++;

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, interactionNonce, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);
    }

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance - totalInputValue);
    await expectBalance(2, 0n);

    // finalise
    const expectedAsyncResult: DefiInteractionNote[] = [];
    for (let i = 0; i < numAsyncInteractions; ++i) {
      const inputValue = BigInt(i + 1);
      const interactionNonce = i * numberOfBridgeCalls;
      const txHash = await rollupProcessor.processAsyncDefiInteraction(interactionNonce);
      const asyncResult = new DefiInteractionNote(
        bridgeId,
        interactionNonce,
        inputValue,
        outputValueA,
        outputValueB,
        true,
      );
      expectedAsyncResult.push(asyncResult);
      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncResult(txHash, [asyncResult]);
      await expectAsyncHashes(expectedAsyncResult);
    }

    await expectBalance(0, outputValueA * BigInt(numAsyncInteractions));
    await expectBalance(1, initialBalance - totalInputValue);
    await expectBalance(2, outputValueB * BigInt(numAsyncInteractions));

    // populate hashes with asyncHashes
    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);
      rollupId++;

      await expectResult(txHash, []);
      await expectHashes(expectedAsyncResult);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);
    }

    // process the last `numberOfBridgeCalls` interaction hashes
    {
      const defiInteractionData = expectedAsyncResult.slice(-numberOfBridgeCalls);
      const previousDefiInteractionHash = packInteractionNotes(defiInteractionData);
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId,
        previousDefiInteractionHash,
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);
      rollupId++;

      await expectResult(txHash, []);
      await expectHashes(expectedAsyncResult.slice(0, expectedAsyncResult.length - numberOfBridgeCalls));
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);
    }
  });

  it('emit result in the same rollup when failed to call convert on an async defi bridge', async () => {
    const inputValue = 10n;
    const { bridgeId } = await mockAsyncBridge({
      canConvert: false,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    const expectedResult = [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)];
    await expectResult(txHash, expectedResult);
    await expectHashes(expectedResult);
    await expectAsyncResult(txHash, []);
    await expectAsyncHashes([]);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);
  });

  it('revert if fail to transfer output token from the bridge', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      returnValueA: 0n,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('revert if the bridge does not transfer enough output ETH to rollup processor', async () => {
    const inputValue = 20n;
    const outputValueA = 7n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      outputAssetIdA: 0,
      outputValueA,
      returnValueA: 6n,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('revert if the bridge returns non empty output value B when number of output assets is 1', async () => {
    const inputValue = 20n;
    const outputValueA = 7n;
    const outputValueB = 1n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      secondOutputAssetValid: false,
      outputValueA,
      outputValueB,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('transfer input token back to rollup processor if fail to finalise', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      outputValueA: 0n,
      returnInputValue: inputValue,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);

      await expectResult(txHash, []);
      await expectHashes([]);
      const expectedAsyncResult = [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)];
      await expectAsyncHashes(expectedAsyncResult);
      await expectAsyncResult(txHash, expectedAsyncResult);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance);
    }
  });

  it('refund input ETH to rollup processor if fail to finalise', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      inputAssetId: 0,
      outputAssetIdA: 1,
      outputValueA: 0n,
      returnInputValue: inputValue,
    });

    const initialBalance = 50n;
    await topupEth(initialBalance);

    await expectBalance(0, initialBalance);
    await expectBalance(1, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, initialBalance - inputValue);
      await expectBalance(1, 0n);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);

      await expectResult(txHash, []);
      await expectHashes([]);
      const expectedAsyncResult = [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)];
      await expectAsyncHashes(expectedAsyncResult);
      await expectAsyncResult(txHash, expectedAsyncResult);

      await expectBalance(0, initialBalance);
      await expectBalance(1, 0n);
    }
  });

  it('revert if fail to transfer input token back from the bridge', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      outputValueA: 0n,
      returnInputValue: inputValue - 1n,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('revert if the bridge does not refund enough input ETH to rollup processor', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge({
      inputAssetId: 0,
      outputAssetIdA: 1,
      outputValueA: 0n,
      returnInputValue: inputValue - 1n,
    });

    const initialBalance = 50n;
    await topupEth(initialBalance);

    await expectBalance(0, initialBalance);
    await expectBalance(1, 0n);
    await expectBalance(2, 0n);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, [new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, true)]);
      await expectHashes([]);
      await expectAsyncResult(txHash, []);
      await expectAsyncHashes([]);

      await expectBalance(0, initialBalance - inputValue);
      await expectBalance(1, 0n);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('cannot process the same interaction more than once', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge();

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.processAsyncDefiInteraction(0);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });

  it('cannot process an unknown interaction', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge();

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    await expect(rollupProcessor.processAsyncDefiInteraction(1)).rejects.toThrow();
  });

  it('cannot process an interaction from another bridge', async () => {
    const inputValue = 20n;
    const { bridgeId: bridgeId0, bridge: bridge0 } = await mockAsyncBridge();
    const { bridgeId: bridgeId1, bridge: bridge1 } = await mockAsyncBridge();

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeId0, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    {
      const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeId1, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls + 1)).rejects.toThrow();
    await expect(rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls + 2)).rejects.toThrow();

    await rollupProcessor.processAsyncDefiInteraction(0);
    await rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls);
  });

  it('will finalise if async array is 1 from max size', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge();

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.stubAsyncTransactionHashes(511);
    await expect((await rollupProcessor.asyncDefiInteractionHashes()).length).toEqual(511);
    await rollupProcessor.processAsyncDefiInteraction(0);
    await expect((await rollupProcessor.asyncDefiInteractionHashes()).length).toEqual(512);
  });

  it('will fail to finalise if async array is max size', async () => {
    const inputValue = 20n;
    const { bridgeId, bridge } = await mockAsyncBridge();

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });

    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.stubAsyncTransactionHashes(512);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow();
  });
});
