import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Asset } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
import { randomBytes } from 'crypto';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import { createRollupProof, createSendProof, DefiInteractionData } from './fixtures/create_mock_proof';
import { deployMockBridge } from './fixtures/setup_defi_bridges';
import { setupRollupProcessor } from './fixtures/setup_rollup_processor';
import { RollupProcessor } from './rollup_processor';
import { LogDescription } from 'ethers/lib/utils';

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

describe('rollup_processor: defi bridge failures', () => {
  let rollupProcessor: RollupProcessor;
  let assets: Asset[];
  let uniswapBridgeIds: BridgeId[][];
  let signers: Signer[];
  let addresses: EthAddress[];
  let rollupProvider: Signer;
  let assetAddresses: EthAddress[];

  const topupToken = async (assetId: AssetId, amount: bigint) =>
    assets[assetId].mint(amount, rollupProcessor.address, { signingAddress: addresses[0] });

  const topupEth = async (amount: bigint) =>
    signers[0].sendTransaction({ to: rollupProcessor.address.toString(), value: Number(amount) });

  const dummyProof = () => createSendProof(AssetId.ETH);

  const mockBridge = async (
    bridgeId: Partial<BridgeId>,
    minInputValue = 0n,
    outputValueA = 0n,
    outputValueB = 0n,
    topup = true,
    topupValue?: bigint,
  ) => {
    return deployMockBridge(
      rollupProvider,
      assetAddresses,
      bridgeId,
      minInputValue,
      outputValueA,
      outputValueB,
      topup,
      topupValue,
    );
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

    const expectedHash = packInteractionNotes([
      ...expectedResult,
      ...[...Array(4 - expectedResult.length)].map(() => DefiInteractionNote.EMPTY),
    ]);
    expect(await rollupProcessor.defiInteractionHash()).toEqual(expectedHash);
  };

  const expectBalance = async (assetId: AssetId, balance: bigint) =>
    expect(await assets[assetId].balanceOf(rollupProcessor.address)).toBe(balance);

  const expectRefund = async (bridgeId: BridgeId, inputValue: bigint, txHash: TxHash) => {
    await expectBalance(bridgeId.inputAssetId, inputValue);
    await expectBalance(bridgeId.outputAssetIdA, 0n);
    if (bridgeId.numOutputAssets > 1) {
      await expectBalance(bridgeId.outputAssetIdB, 0n);
    }
    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, 0n, 0n, false)], txHash);
  };

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses, uniswapBridgeIds } = await setupRollupProcessor(signers, 2));
  });

  it('process failed defi interaction that converts token to eth', async () => {
    const minInputValue = 20n;
    const inputValue = minInputValue - 1n;
    const cloneFromBridge = uniswapBridgeIds[AssetId.DAI][AssetId.ETH];
    const bridgeId = await mockBridge({ ...cloneFromBridge, outputAssetIdB: undefined }, minInputValue);

    await topupToken(AssetId.DAI, inputValue);

    await expectBalance(AssetId.DAI, inputValue);
    await expectBalance(AssetId.ETH, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectRefund(bridgeId, inputValue, txHash);
  });

  it('process failed defi interaction that converts eth to token', async () => {
    const minInputValue = 20n;
    const inputValue = minInputValue - 1n;
    const cloneFromBridge = uniswapBridgeIds[AssetId.ETH][AssetId.DAI];
    const bridgeId = await mockBridge({ ...cloneFromBridge, outputAssetIdB: undefined }, minInputValue);

    await topupEth(inputValue);

    await expectBalance(AssetId.ETH, inputValue);
    await expectBalance(AssetId.DAI, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectRefund(bridgeId, inputValue, txHash);
  });

  it('revert if prev defiInteraction hash is wrong', async () => {
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      previousDefiInteractionHash: randomBytes(32),
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: INCORRECT_PREV_DEFI_INTERACTION_HASH');
  });

  it('revert if total input value is empty', async () => {
    const bridgeId = uniswapBridgeIds[AssetId.DAI][AssetId.ETH];
    const inputValue = 0n;
    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    await expect(rollupProcessor.sendTx(tx)).rejects.toThrow('Rollup Processor: ZERO_TOTAL_INPUT_VALUE');
  });
});
