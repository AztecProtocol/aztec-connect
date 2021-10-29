import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { Asset } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { computeInteractionHashes, DefiInteractionNote } from '@aztec/barretenberg/note_algorithms';
import { TxHash } from '@aztec/barretenberg/tx_hash';
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

  const topupToken = async (assetId: AssetId, amount: bigint) =>
    assets[assetId].mint(amount, rollupProcessor.address, { signingAddress: addresses[0] });

  const topupEth = async (amount: bigint) =>
    signers[0].sendTransaction({ to: rollupProcessor.address.toString(), value: Number(amount) });

  const dummyProof = () => createSendProof(AssetId.ETH);

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

  it('process defi interaction data that converts token to eth', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.ETH,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(AssetId.DAI, inputValue);

    await expectBalance(AssetId.DAI, inputValue);
    await expectBalance(AssetId.ETH, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.DAI, 0n);
    await expectBalance(AssetId.ETH, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process defi interaction data if defiInteractionHash is 1 from max size', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.ETH,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(AssetId.DAI, inputValue);

    await expectBalance(AssetId.DAI, inputValue);
    await expectBalance(AssetId.ETH, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });

    await rollupProcessor.stubTransactionHashes(1022);

    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await rollupProcessor.sendTx(tx);
  });

  it('process defi interaction data that converts eth to token', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetId: AssetId.ETH,
      outputAssetIdA: AssetId.renBTC,
      outputValueA,
    });
    const inputValue = 20n;

    await topupEth(inputValue);

    await expectBalance(AssetId.ETH, inputValue);
    await expectBalance(AssetId.renBTC, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.ETH, 0n);
    await expectBalance(AssetId.renBTC, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process defi interaction data that converts token to token', async () => {
    const outputValueA = 15n;
    const bridgeId = await mockBridge({
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.renBTC,
      outputValueA,
    });
    const inputValue = 20n;

    await topupToken(AssetId.DAI, inputValue);

    await expectBalance(AssetId.DAI, inputValue);
    await expectBalance(AssetId.renBTC, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.DAI, 0n);
    await expectBalance(AssetId.renBTC, outputValueA);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, 0n, true)], txHash);
  });

  it('process more than one defi interaction data', async () => {
    const bridge0 = await mockBridge({ inputAssetId: AssetId.ETH, outputAssetIdA: AssetId.DAI, outputValueA: 21n });
    const bridge1 = await mockBridge({ inputAssetId: AssetId.DAI, outputAssetIdA: AssetId.ETH, outputValueA: 22n });
    const bridge2 = await mockBridge({
      inputAssetId: AssetId.DAI,
      outputAssetIdA: AssetId.renBTC,
      outputValueA: 23n,
      canConvert: false,
    });
    const bridge3 = await mockBridge({ inputAssetId: AssetId.renBTC, outputAssetIdA: AssetId.DAI, outputValueA: 24n });

    await topupEth(100n);
    await topupToken(AssetId.DAI, 100n);
    await topupToken(AssetId.renBTC, 100n);

    await expectBalance(AssetId.ETH, 100n);
    await expectBalance(AssetId.DAI, 100n);
    await expectBalance(AssetId.renBTC, 100n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [
        new DefiInteractionData(bridge0, 11n),
        new DefiInteractionData(bridge1, 12n),
        new DefiInteractionData(bridge2, 13n),
        new DefiInteractionData(bridge3, 14n),
      ],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.ETH, 100n - 11n + 22n);
    await expectBalance(AssetId.DAI, 100n - 12n + 21n + 24n);
    await expectBalance(AssetId.renBTC, 100n - 14n);

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
      secondAssetValid: true,
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

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.ETH, outputValueA);
    await expectBalance(AssetId.DAI, initialTokenBalance - inputValue);
    await expectBalance(AssetId.renBTC, outputValueB);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, outputValueA, outputValueB, true)], txHash);
  });
});
