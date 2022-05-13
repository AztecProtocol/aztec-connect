import { EthAddress } from '@aztec/barretenberg/address';
import { isVirtualAsset } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { DefiInteractionEvent } from '@aztec/barretenberg/block_source/defi_interaction_event';
import { BridgeId, virtualAssetIdFlag } from '@aztec/barretenberg/bridge_id';
import { computeInteractionHashes } from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof/rollup_proof_data';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { LogDescription } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge, MockBridgeParams } from './fixtures/setup_defi_bridges';
import { setupTestRollupProcessor } from './fixtures/setup_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

const parseInteractionResultFromLog = (log: LogDescription) => {
  const {
    args: { bridgeId, nonce, totalInputValue, totalOutputValueA, totalOutputValueB, result, errorReason },
  } = log;
  return new DefiInteractionEvent(
    BridgeId.fromBigInt(BigInt(bridgeId)),
    nonce.toNumber(),
    BigInt(totalInputValue),
    BigInt(totalOutputValueA),
    BigInt(totalOutputValueB),
    result,
    Buffer.from(errorReason.slice(2), 'hex'),
  );
};

describe('rollup_processor: defi bridge failures', () => {
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

  const expectResult = async (expectedResult: DefiInteractionEvent[], txHash: TxHash) => {
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
      ...[...Array(numberOfBridgeCalls - expectedResult.length)].map(() => DefiInteractionEvent.EMPTY),
    ]);

    const hashes = await rollupProcessor.defiInteractionHashes();
    const resultHashes = [
      ...hashes,
      ...[...Array(numberOfBridgeCalls - hashes.length)].map(() => WorldStateConstants.EMPTY_INTERACTION_HASH),
    ];
    expect(expectedHashes).toEqual(resultHashes);
  };

  const expectFailedResult = async (bridgeId: BridgeId, inputValue: bigint, txHash: TxHash, reason: Buffer) => {
    await expectResult([new DefiInteractionEvent(bridgeId, 0, inputValue, 0n, 0n, false, reason)], txHash);
  };

  const expectBalance = async (assetId: number, balance: bigint) => {
    if (!isVirtualAsset(assetId)) {
      expect(await assets[assetId].balanceOf(rollupProcessor.address)).toBe(balance);
    }
  };

  const formatErrorMsg = (reason: string) => {
    // format the abi encoding of `revert(reason)`
    // first word is ERROR signature 0x08c379a000000000000000000000000000000000000000000000000000000000
    // 2nd word is position of start of string
    // 3rd word is length of string
    // remaining data is string, padded to a multiple of 32 bytes
    const paddingSize = 32 - (reason.length % 32);
    const signature = Buffer.from('08c379a0', 'hex');
    const offset = toBufferBE(BigInt(32), 32);
    const byteLength = toBufferBE(BigInt(reason.length), 32);
    const reasonBytes = Buffer.concat([Buffer.from(reason, 'utf8'), Buffer.alloc(paddingSize)]);

    return Buffer.concat([signature, offset, byteLength, reasonBytes]);
  };

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses } = await setupTestRollupProcessor(signers));
  });

  it('process failed defi interaction that converts token to eth', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      outputAssetIdA: 0,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupToken(1, inputValue);

    await expectBalance(1, inputValue);
    await expectBalance(0, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(1, inputValue);
    await expectBalance(0, 0n);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('process failed defi interaction that converts eth to token', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 0,
      outputAssetIdA: 1,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupEth(inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('process failed defi interaction that converts eth and token to another token', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 0,
      inputAssetIdB: 2,
      outputAssetIdA: 1,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupEth(inputValue);
    await topupToken(2, inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);
    await expectBalance(2, inputValue);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);
    await expectBalance(2, inputValue);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('process failed defi interaction that converts two tokens to eth', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      inputAssetIdB: 2,
      outputAssetIdA: 0,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupToken(1, inputValue);
    await topupToken(2, inputValue);

    await expectBalance(0, 0n);
    await expectBalance(1, inputValue);
    await expectBalance(2, inputValue);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 0n);
    await expectBalance(1, inputValue);
    await expectBalance(2, inputValue);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('process failed defi interaction that converts token and a virtual asset to eth', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 1,
      inputAssetIdB: 2 + virtualAssetIdFlag,
      outputAssetIdA: 0,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupToken(1, inputValue);

    await expectBalance(0, 0n);
    await expectBalance(1, inputValue);
    await expectBalance(2, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, 0n);
    await expectBalance(1, inputValue);
    await expectBalance(2, 0n);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('process failed defi interaction and emit the error as the last param of the event', async () => {
    const bridgeId = await mockBridge({
      inputAssetIdA: 0,
      outputAssetIdA: 1,
      canConvert: false,
    });

    const inputValue = 10n;
    await topupEth(inputValue);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(0, inputValue);
    await expectBalance(1, 0n);
    await expectFailedResult(bridgeId, inputValue, txHash, formatErrorMsg('MockDefiBridge: canConvert = false'));
  });

  it('revert if prev defiInteraction hash is wrong', async () => {
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      previousDefiInteractionHash: randomBytes(32),
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('INCORRECT_PREVIOUS_DEFI_INTERACTION_HASH');
  });

  it('revert if total input value is empty', async () => {
    const bridgeId = await mockBridge();
    const inputValue = 0n;
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('ZERO_TOTAL_INPUT_VALUE');
  });

  it('process defi interaction data fails if defiInteractionHash is max size', async () => {
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

    await rollupProcessor.stubTransactionHashes(1023);
    // when processDefiInteractions is called, NUM_BRIDGE_CALLS will be popped off of the defiInteractionHashes array.
    // 1 defi interaction hash is then added due to the rollup proof containing a DefiInteractionData object.
    // if we then copy NUM_BRIDGE_CALLS async tx hashes into defiInteractionHashes, we should trigger the array overflow
    await rollupProcessor.stubAsyncTransactionHashes(RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK);
    const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('ARRAY_OVERFLOW');
  });
});
