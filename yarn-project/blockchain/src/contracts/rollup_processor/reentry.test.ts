import { bufferToHex } from 'ethereumjs-util';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert, setEthBalance } from '../../ganache/hardhat_chain_manipulation.js';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof.js';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor.js';
import { RollupProcessor } from './rollup_processor.js';
import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { computeInteractionHashes, DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { keccak256, LogDescription, toUtf8Bytes } from 'ethers/lib/utils.js';
import { DefiInteractionEvent } from '@aztec/barretenberg/block_source';

const parseInteractionEventResultFromLog = (log: LogDescription) => {
  const {
    args: { encodedBridgeCallData, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result, errorReason },
  } = log;
  return new DefiInteractionEvent(
    BridgeCallData.fromBigInt(BigInt(encodedBridgeCallData)),
    nonce.toNumber(),
    BigInt(totalInputValue),
    BigInt(totalOutputValueA),
    BigInt(totalOutputValueB),
    result,
    Buffer.from(errorReason.slice(2), 'hex'),
  );
};

// TODO: Need to look at the async events as well.

describe('rollup_processor: reentry', () => {
  let rollupProcessor: RollupProcessor;
  let reentryBridge: Contract;
  let bridgeAddressId: number;

  let assets: Asset[];
  let rollupProvider: Signer;
  let userSigners: Signer[];
  let userAddresses: EthAddress[];

  let snapshot: string;

  const amount = 1n;
  const numberOfBridgeCalls = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK;

  const dummyProof = () => createSendProof(0);

  const getCalldata = (functionSignature: string, ...args: any) => {
    const fragment = rollupProcessor.contract.interface.functions[functionSignature];
    const calldata = rollupProcessor.contract.interface.encodeFunctionData(fragment, [...args]);
    return calldata;
  };

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

  const expectResult = async (
    expectedResultEventOrder: DefiInteractionEvent[],
    expectedResultStorage: DefiInteractionEvent[],
    txHash: TxHash,
  ) => {
    const receipt = await ethers.provider.getTransactionReceipt(txHash.toString());
    const interactionResult = receipt.logs
      .filter(l => l.address === rollupProcessor.address.toString())
      .map(l => rollupProcessor.contract.interface.parseLog(l))
      .filter(e => e.eventFragment.name === 'DefiBridgeProcessed')
      .map(parseInteractionEventResultFromLog);
    expect(interactionResult.length).toBe(expectedResultEventOrder.length);

    for (let i = 0; i < expectedResultEventOrder.length; ++i) {
      expect(interactionResult[i]).toEqual(expectedResultEventOrder[i]);
    }

    const cleanedExpectedResultStorage = expectedResultStorage.map(
      a =>
        new DefiInteractionNote(
          a.bridgeCallData,
          a.nonce,
          a.totalInputValue,
          a.totalOutputValueA,
          a.totalOutputValueB,
          a.result,
        ),
    );

    const expectedHashes = computeInteractionHashes([
      ...cleanedExpectedResultStorage,
      ...[...Array(numberOfBridgeCalls - cleanedExpectedResultStorage.length)].map(() => DefiInteractionNote.EMPTY),
    ]);
    const hashes = await rollupProcessor.defiInteractionHashes();
    const resultHashes = [
      ...hashes,
      ...[...Array(numberOfBridgeCalls - hashes.length)].map(() => WorldStateConstants.EMPTY_INTERACTION_HASH),
    ];

    expect(expectedHashes).toEqual(resultHashes);
  };

  const formatCustomErrorMsg = (reason: string) => {
    return Buffer.from(keccak256(toUtf8Bytes(reason)).substring(2), 'hex').subarray(0, 4);
  };

  beforeAll(async () => {
    const signers = await ethers.getSigners();
    [rollupProvider, ...userSigners] = signers;
    userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ assets, rollupProcessor } = await setupTestRollupProcessor(signers));

    reentryBridge = await (
      await ethers.getContractFactory('ReentryBridge', rollupProvider)
    ).deploy(rollupProcessor.address.toString());
    expect(await rollupProcessor.setSupportedBridge(EthAddress.fromString(reentryBridge.address), 1000000));
    bridgeAddressId = (await rollupProcessor.getSupportedBridges()).length;

    await topupEth(10n * 10n ** 18n);
    await setEthBalance(EthAddress.fromString(reentryBridge.address), 10n * 10n ** 18n);
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('should be able to reenter process async defi interaction from rollup', async () => {
    // When using async. Recall that events and storage updates might not be the same order.
    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    // Add no operation to stack, calldata just used to have some bytes
    await reentryBridge.addAction(
      0,
      true,
      true,
      true,
      getCalldata('processAsyncDefiInteraction(uint256)', 0),
      amount,
      0,
    );

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectResult([], [], txHash);

    {
      // Add operation to process async
      await reentryBridge.addAction(
        32,
        false,
        false,
        false,
        getCalldata('processAsyncDefiInteraction(uint256)', 0),
        amount,
        0,
      );

      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
      });

      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      const interactions = [
        new DefiInteractionEvent(bridgeCallData, 0, amount, amount, 0n, true, Buffer.alloc(0)),
        new DefiInteractionEvent(bridgeCallData, 32, amount, amount, 0n, true, Buffer.alloc(0)),
      ];
      const interactionsStorage = [interactions[1], interactions[0]];
      await expectResult(interactions, interactionsStorage, txHash);
    }
  });

  it('should be able to reenter process async defi interaction from async defi interaction inside rollup', async () => {
    // When using async. Recall that events and storage updates might not be the same order.
    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    // Add no operation to stack, calldata just used to have some bytes
    await reentryBridge.addAction(0, true, true, true, '0x', amount, 0);
    await reentryBridge.addAction(
      1,
      true,
      true,
      false,
      getCalldata('processAsyncDefiInteraction(uint256)', 0),
      amount,
      0,
    );

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [
        new DefiInteractionData(bridgeCallData, amount),
        new DefiInteractionData(bridgeCallData, amount),
      ],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectResult([], [], txHash);

    {
      // Add operation to process async
      await reentryBridge.addAction(
        32,
        false,
        false,
        false,
        getCalldata('processAsyncDefiInteraction(uint256)', 1),
        amount,
        0,
      );

      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
      });

      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      const interactions = [
        new DefiInteractionEvent(bridgeCallData, 0, amount, amount, 0n, true, Buffer.alloc(0)),
        new DefiInteractionEvent(bridgeCallData, 1, amount, amount, 0n, true, Buffer.alloc(0)),
        new DefiInteractionEvent(bridgeCallData, 32, amount, amount, 0n, true, Buffer.alloc(0)),
      ];
      const interactionsStorage = [interactions[2], interactions[0], interactions[1]];
      await expectResult(interactions, interactionsStorage, txHash);
    }
  });

  it('should revert when reenter processRollup from async defi interaction inside rollup', async () => {
    // When using async. Recall that events and storage updates might not be the same order.
    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    // Add processRollup action inside an async operation
    await reentryBridge.addAction(
      0,
      true,
      true,
      false,
      getCalldata('processRollup(bytes,bytes)', '0x', '0x'),
      amount,
      0,
    );

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    await expectResult([], [], txHash);

    {
      // Add operation to process async
      await reentryBridge.addAction(
        32,
        false,
        false,
        false,
        getCalldata('processAsyncDefiInteraction(uint256)', 0),
        amount,
        0,
      );

      const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
        rollupId: 1,
        defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
      });

      const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
      const txHash = await rollupProcessor.sendTx(tx);

      // Notice, there will never be an event for the "inner" async, because it will fail before emitting the event.
      const interactions = [
        new DefiInteractionEvent(
          bridgeCallData,
          32,
          amount,
          0n,
          0n,
          false,
          formatCustomErrorMsg('LOCKED_NO_REENTER()'),
        ),
      ];
      const interactionsStorage = interactions;
      await expectResult(interactions, interactionsStorage, txHash);
    }
  });

  it('should revert when reentering deposit from rollup', async () => {
    const assetId = 0;
    const owner = userAddresses[0];
    const proofHash = Buffer.alloc(32);
    const calldata = getCalldata(
      'depositPendingFunds(uint256,uint256,address,bytes32)',
      assetId,
      amount,
      owner.toString(),
      bufferToHex(proofHash),
    );

    // Add action to stack
    await reentryBridge.addAction(0, false, false, false, calldata, amount, 0);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions = [
      new DefiInteractionEvent(bridgeCallData, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()')),
    ];
    await expectResult(interactions, interactions, txHash);
  });

  it('should revert when reentering set supported bridge from rollup', async () => {
    const owner = userAddresses[0];
    expect(
      await rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await rollupProvider.getAddress()),
      }),
    );

    const calldata = getCalldata('setSupportedBridge(address,uint256)', owner.toString(), 50000);

    // Add action to stack
    await reentryBridge.addAction(0, false, false, false, calldata, amount, 0);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions = [
      new DefiInteractionEvent(bridgeCallData, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()')),
    ];
    await expectResult(interactions, interactions, txHash);
  });

  it('should revert when reentering set supported asset from rollup', async () => {
    const owner = userAddresses[0];
    expect(
      await rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await rollupProvider.getAddress()),
      }),
    );

    await reentryBridge.addAction(
      0,
      false,
      false,
      false,
      getCalldata('setSupportedAsset(address,uint256)', owner.toString(), 50000),
      amount,
      0,
    );

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions = [
      new DefiInteractionEvent(bridgeCallData, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()')),
    ];
    await expectResult(interactions, interactions, txHash);
  });

  it('should revert when reentering process rollup from rollup', async () => {
    await reentryBridge.addAction(
      0,
      false,
      false,
      false,
      getCalldata('processRollup(bytes,bytes)', '0x', '0x'),
      amount,
      0,
    );

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions = [
      new DefiInteractionEvent(bridgeCallData, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()')),
    ];
    await expectResult(interactions, interactions, txHash);
  });

  it('should revert when reentering deposit from async', async () => {
    const assetId = 0;
    const owner = userAddresses[0];
    const proofHash = Buffer.alloc(32);
    const calldata = getCalldata(
      'depositPendingFunds(uint256,uint256,address,bytes32)',
      assetId,
      amount,
      owner.toString(),
      bufferToHex(proofHash),
    );

    // Add action to stack
    await reentryBridge.addAction(0, true, true, false, calldata, amount, 0);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
  });

  it('should revert when reentering set supported bridge from async', async () => {
    const owner = userAddresses[0];
    expect(
      await rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await rollupProvider.getAddress()),
      }),
    );

    const calldata = getCalldata('setSupportedBridge(address,uint256)', owner.toString(), 50000);

    // Add action to stack
    await reentryBridge.addAction(0, true, true, false, calldata, amount, 0);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
  });

  it('should revert when reentering set supported asset from async', async () => {
    const owner = userAddresses[0];
    expect(
      await rollupProcessor.setThirdPartyContractStatus(true, {
        signingAddress: EthAddress.fromString(await rollupProvider.getAddress()),
      }),
    );

    const calldata = getCalldata('setSupportedAsset(address,uint256)', owner.toString(), 50000);

    // Add action to stack
    await reentryBridge.addAction(0, true, true, false, calldata, amount, 0);

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
  });

  it('should revert when reentering process rollup from async', async () => {
    await reentryBridge.addAction(
      0,
      true,
      true,
      false,
      getCalldata('processRollup(bytes,bytes)', '0x', '0x'),
      amount,
      0,
    );

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
  });

  it('should revert when re-entering from deposit', async () => {
    const reenterToken = await (await ethers.getContractFactory('ERC20Reenter', rollupProvider)).deploy();

    await rollupProcessor.setSupportedAsset(EthAddress.fromString(reenterToken.address), 1000000);
    const assetId = (await rollupProcessor.getSupportedAssets()).length;

    await expect(rollupProcessor.depositPendingFunds(assetId, 0n)).rejects.toThrow('LOCKED_NO_REENTER');
  });

  it('should revert when async reenter tries to execute same interaction nonce twice', async () => {
    const asyncReenter = await (
      await ethers.getContractFactory('ReentryAsync', rollupProvider)
    ).deploy(rollupProcessor.address.toString());
    await setEthBalance(EthAddress.fromString(asyncReenter.address), 10n * 10n ** 18n);

    expect(await rollupProcessor.setSupportedBridge(EthAddress.fromString(asyncReenter.address), 5000000));
    const bridgeAddressId = (await rollupProcessor.getSupportedBridges()).length;

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    await asyncReenter.setValues(0, 1000);

    await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('INVALID_BRIDGE_CALL_DATA()');
  });

  it('failing async will revert and not "spend" the interactionNonce', async () => {
    const failingBridge = await (
      await ethers.getContractFactory('FailingBridge', rollupProvider)
    ).deploy(rollupProcessor.address.toString());
    await setEthBalance(EthAddress.fromString(failingBridge.address), 10n * 10n ** 18n);

    expect(await rollupProcessor.setSupportedBridge(EthAddress.fromString(failingBridge.address), 1000000));
    const bridgeAddressId = (await rollupProcessor.getSupportedBridges()).length;

    const bridgeCallData = new BridgeCallData(bridgeAddressId, 0, 0);

    const { encodedProofData } = createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeCallData, amount)],
    });

    const tx = await rollupProcessor.createRollupProofTx(encodedProofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);
    const interactions: DefiInteractionEvent[] = [];
    await expectResult(interactions, interactions, txHash);

    expect((await rollupProcessor.contract.pendingDefiInteractions(0)).encodedBridgeCallData.toNumber()).toBe(
      bridgeAddressId,
    );

    const assetBalance = await assets[0].balanceOf(rollupProcessor.address);

    expect(await rollupProcessor.processAsyncDefiInteraction(0));
    expect(await assets[0].balanceOf(rollupProcessor.address)).toBe(assetBalance);

    expect((await rollupProcessor.contract.pendingDefiInteractions(0)).encodedBridgeCallData.toNumber()).toBe(
      bridgeAddressId,
    );

    await failingBridge.setComplete(true, 0);
    expect(await rollupProcessor.processAsyncDefiInteraction(0));

    expect((await rollupProcessor.contract.pendingDefiInteractions(0)).encodedBridgeCallData.toNumber()).toBe(0);
    expect(await assets[0].balanceOf(rollupProcessor.address)).toBe(assetBalance + amount);
  });
});
