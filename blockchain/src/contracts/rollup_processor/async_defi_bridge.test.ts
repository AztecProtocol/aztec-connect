// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { computeInteractionHashes, DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { Signer } from 'ethers';
import { LogDescription } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert, setEthBalance } from '../../ganache/hardhat_chain_manipulation';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { mockAsyncBridge } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

const parseInteractionResultFromLog = (log: LogDescription) => {
  const {
    args: { encodedBridgeCallData, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result },
  } = log;
  return new DefiInteractionNote(
    BridgeCallData.fromBigInt(BigInt(encodedBridgeCallData)),
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

  let snapshot: string;

  const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

  const topupToken = (assetId: number, amount: bigint) =>
    assets[assetId].mint(amount, rollupProcessor.address, { signingAddress: addresses[0] });

  const topupEth = async (amount: bigint) => {
    if (rollupProvider.provider) {
      await setEthBalance(
        rollupProcessor.address,
        amount + (await rollupProvider.provider.getBalance(rollupProcessor.address.toString())).toBigInt(),
      );
    } else {
      await setEthBalance(rollupProcessor.address, amount);
    }
  };

  const dummyProof = () => createSendProof();

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
    expect(await rollupProcessor.defiInteractionHashes()).to.be.eql(expectedHashes);
  };

  const expectAsyncHashes = async (expectedResult: DefiInteractionNote[]) => {
    const expectedHashes = computeInteractionHashes(expectedResult);
    expect(await rollupProcessor.asyncDefiInteractionHashes()).to.be.eql(expectedHashes);
  };

  const expectResult = async (txHash: TxHash, expectedResult: DefiInteractionNote[]) => {
    expect(await fetchResult(txHash)).to.be.eql(expectedResult);
  };

  const expectBalance = async (assetId: number, balance: bigint) =>
    expect(await assets[assetId].balanceOf(rollupProcessor.address)).to.be.eq(balance);

  before(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('process defi interaction data that has two output assets', async () => {
    const inputValue = 20n;
    const outputValueA = 12n;
    const outputValueB = 7n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      inputAssetIdA: 1,
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
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);

      const expectedAsyncResult = [
        new DefiInteractionNote(bridgeCallData, 0, inputValue, outputValueA, outputValueB, true),
      ];
      await expectResult(txHash, expectedAsyncResult);
      await expectHashes([]);
      await expectAsyncHashes(expectedAsyncResult);

      await expectBalance(0, outputValueA);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, outputValueB);
    }

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([new DefiInteractionNote(bridgeCallData, 0, inputValue, outputValueA, outputValueB, true)]);
      await expectAsyncHashes([]);
    }
  });

  it('emit result in the same rollup when failed to call convert on an async defi bridge', async () => {
    const inputValue = 10n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      canConvert: false,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    const expectedResult = [new DefiInteractionNote(bridgeCallData, 0, inputValue, 0n, 0n, false)];
    await expectResult(txHash, expectedResult);
    await expectHashes(expectedResult);
    await expectAsyncHashes([]);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);
  });

  it('revert if fail to transfer output token from the bridge', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      returnValueA: 0n,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('revert if the bridge does not transfer enough output ETH to rollup processor', async () => {
    const inputValue = 20n;
    const outputValueA = 7n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
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
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('revert if the bridge returns non empty output value B when number of output assets is 1', async () => {
    const inputValue = 20n;
    const outputValueA = 7n;
    const outputValueB = 1n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      outputValueA,
      outputValueB,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('transfer input token back to rollup processor if fail to finalise', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      outputValueA: 0n,
      returnInputValue: inputValue,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);
      const expectedAsyncResult = [new DefiInteractionNote(bridgeCallData, 0, inputValue, 0n, 0n, false)];
      await expectResult(txHash, expectedAsyncResult);
      await expectHashes([]);
      await expectAsyncHashes(expectedAsyncResult);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance);
    }
  });

  it('refund input tokens back to rollup processor if finalise returns no tokens', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      inputAssetIdA: 0,
      inputAssetIdB: 1,
      outputValueA: 0n,
      outputValueB: 0n,
      returnInputValue: inputValue,
    });

    const initialBalance = 50n;
    await topupEth(initialBalance);
    await topupToken(1, initialBalance);

    await expectBalance(0, initialBalance);
    await expectBalance(1, initialBalance);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, initialBalance - inputValue);
      await expectBalance(1, initialBalance - inputValue);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);
      const expectedAsyncResult = [new DefiInteractionNote(bridgeCallData, 0, inputValue, 0n, 0n, false)];
      await expectResult(txHash, expectedAsyncResult);
      await expectHashes([]);
      await expectAsyncHashes(expectedAsyncResult);

      await expectBalance(0, initialBalance);
      await expectBalance(1, initialBalance);
    }
  });

  it('refund input ETH to rollup processor if fail to finalise', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      inputAssetIdA: 0,
      outputAssetIdA: 1,
      outputValueA: 0n,
      returnInputValue: inputValue,
    });

    const initialBalance = 50n;
    await topupEth(initialBalance);

    await expectBalance(0, initialBalance);
    await expectBalance(1, 0n);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, initialBalance - inputValue);
      await expectBalance(1, 0n);
    }

    {
      const txHash = await rollupProcessor.processAsyncDefiInteraction(0);
      const expectedAsyncResult = [new DefiInteractionNote(bridgeCallData, 0, inputValue, 0n, 0n, false)];
      await expectResult(txHash, expectedAsyncResult);
      await expectHashes([]);

      await expectAsyncHashes(expectedAsyncResult);

      await expectBalance(0, initialBalance);
      await expectBalance(1, 0n);
    }
  });

  it('revert if fail to transfer input token back from the bridge', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      outputValueA: 0n,
      returnInputValue: inputValue - 1n,
    });

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    await expectBalance(0, 0n);
    await expectBalance(1, initialBalance);
    await expectBalance(2, 0n);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, 0n);
      await expectBalance(1, initialBalance - inputValue);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('revert if the bridge does not refund enough input ETH to rollup processor', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses, {
      inputAssetIdA: 0,
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
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      await expectResult(txHash, []);
      await expectHashes([]);
      await expectAsyncHashes([]);

      await expectBalance(0, initialBalance - inputValue);
      await expectBalance(1, 0n);
      await expectBalance(2, 0n);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('cannot process the same interaction more than once', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.processAsyncDefiInteraction(0);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });

  it('cannot process an unknown interaction', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    await expect(rollupProcessor.processAsyncDefiInteraction(1)).to.be.reverted;
  });

  it('cannot process an interaction from another bridge', async () => {
    const inputValue = 20n;
    const { bridgeCallData: bridgeCallData0 } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);
    const { bridgeCallData: bridgeCallData1 } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        defiInteractionData: [new DefiInteractionData(bridgeCallData0, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    {
      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeCallData1, inputValue)],
      });
      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      await rollupProcessor.sendTx(tx);
    }

    await expect(rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls + 1)).to.be.reverted;
    await expect(rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls + 2)).to.be.reverted;

    await rollupProcessor.processAsyncDefiInteraction(0);
    await rollupProcessor.processAsyncDefiInteraction(numberOfBridgeCalls);
  });

  it('will finalise if async array is 1 from max size', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.stubAsyncTransactionHashes(511);
    expect((await rollupProcessor.asyncDefiInteractionHashes()).length).to.be.eql(511);
    await rollupProcessor.processAsyncDefiInteraction(0);
    expect((await rollupProcessor.asyncDefiInteractionHashes()).length).to.be.eql(512);
  });

  it('will fail to finalise if async array is max size', async () => {
    const inputValue = 20n;
    const { bridgeCallData } = await mockAsyncBridge(rollupProvider, rollupProcessor, assetAddresses);

    const initialBalance = 50n;
    await topupToken(1, initialBalance);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, inputValue)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    await rollupProcessor.sendTx(tx);

    await rollupProcessor.stubAsyncTransactionHashes(512);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).to.be.reverted;
  });
});
