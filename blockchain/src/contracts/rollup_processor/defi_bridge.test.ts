import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { Asset } from '@aztec/barretenberg/blockchain';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { DefiInteractionNote, packInteractionNotes } from '@aztec/barretenberg/note_algorithms';
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

describe('rollup_processor: defi bridge', () => {
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

  beforeEach(async () => {
    signers = await ethers.getSigners();
    rollupProvider = signers[0];
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    ({ rollupProcessor, assets, assetAddresses, uniswapBridgeIds } = await setupRollupProcessor(signers, 2));
  });

  it('process defi interaction data that converts token to eth', async () => {
    const bridgeId = uniswapBridgeIds[AssetId.DAI][AssetId.ETH];
    const inputValue = 20n;
    const expectedOutputValue = 19n;

    await topupToken(AssetId.DAI, inputValue);

    await expectBalance(AssetId.DAI, inputValue);
    await expectBalance(AssetId.ETH, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.DAI, 0n);
    await expectBalance(AssetId.ETH, expectedOutputValue);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, expectedOutputValue, 0n, true)], txHash);
  });

  it('process defi interaction data that converts eth to token', async () => {
    const bridgeId = uniswapBridgeIds[AssetId.ETH][AssetId.DAI];
    const inputValue = 20n;
    const expectedOutputValue = 19n;

    await topupEth(inputValue);

    await expectBalance(AssetId.ETH, inputValue);
    await expectBalance(AssetId.DAI, 0n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [new DefiInteractionData(bridgeId, inputValue)],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.DAI, expectedOutputValue);
    await expectBalance(AssetId.ETH, 0n);

    await expectResult([new DefiInteractionNote(bridgeId, 0, inputValue, expectedOutputValue, 0n, true)], txHash);
  });

  it('process more than one defi interaction data', async () => {
    await topupEth(60n);
    await topupToken(AssetId.DAI, 100n);
    await topupToken(AssetId.renBTC, 80n);

    await expectBalance(AssetId.ETH, 60n);
    await expectBalance(AssetId.DAI, 100n);
    await expectBalance(AssetId.renBTC, 80n);

    const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
      defiInteractionData: [
        new DefiInteractionData(uniswapBridgeIds[AssetId.DAI][AssetId.ETH], 78n),
        new DefiInteractionData(uniswapBridgeIds[AssetId.renBTC][AssetId.ETH], 56n),
        new DefiInteractionData(uniswapBridgeIds[AssetId.ETH][AssetId.DAI], 34n),
        new DefiInteractionData(uniswapBridgeIds[AssetId.ETH][AssetId.renBTC], 12n),
      ],
    });
    const tx = await rollupProcessor.createEscapeHatchProofTx(proofData, [], []);
    const txHash = await rollupProcessor.sendTx(tx);

    await expectBalance(AssetId.ETH, 60n - 12n - 34n + 55n + 77n);
    await expectBalance(AssetId.DAI, 100n - 78n + 33n);
    await expectBalance(AssetId.renBTC, 80n - 56n + 11n);

    await expectResult(
      [
        new DefiInteractionNote(uniswapBridgeIds[AssetId.DAI][AssetId.ETH], 0, 78n, 77n, 0n, true),
        new DefiInteractionNote(uniswapBridgeIds[AssetId.renBTC][AssetId.ETH], 1, 56n, 55n, 0n, true),
        new DefiInteractionNote(uniswapBridgeIds[AssetId.ETH][AssetId.DAI], 2, 34n, 33n, 0n, true),
        new DefiInteractionNote(uniswapBridgeIds[AssetId.ETH][AssetId.renBTC], 3, 12n, 11n, 0n, true),
      ],
      txHash,
    );
  });

  it('process defi interaction data that has two output assets', async () => {
    const inputValue = 20n;
    const expectedOutputValueA = 12n;
    const expectedOutputValueB = 7n;
    const bridgeId = await mockBridge(
      {
        numOutputAssets: 2,
        inputAssetId: AssetId.DAI,
        outputAssetIdA: AssetId.ETH,
        outputAssetIdB: AssetId.renBTC,
      },
      0n,
      expectedOutputValueA,
      expectedOutputValueB,
    );

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

    await expectBalance(AssetId.ETH, expectedOutputValueA);
    await expectBalance(AssetId.DAI, initialTokenBalance - inputValue);
    await expectBalance(AssetId.renBTC, expectedOutputValueB);

    await expectResult(
      [new DefiInteractionNote(bridgeId, 0, inputValue, expectedOutputValueA, expectedOutputValueB, true)],
      txHash,
    );
  });
});
