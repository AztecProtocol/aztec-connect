import {
  AztecSdk,
  BridgeCallData,
  createAztecSdk,
  EthAddress,
  InnerProofData,
  RollupProofData,
  WalletProvider,
} from '@aztec/sdk';
import createDebug from 'debug';
import { EventEmitter } from 'events';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
import { jest } from '@jest/globals';
import {
  createAccountProof,
  createDefiClaimProof,
  createDefiDepositProof,
  createDepositProof,
  createRollupProof,
  createSendProof,
  createWithdrawProof,
  DefiInteractionData,
  mergeInnerProofs,
} from './rollup_processor_helpers/create_mock_proof.js';
import {
  DefiInteractionNote,
  packInteractionNotes,
} from '../../barretenberg.js/src/note_algorithms/defi_interaction_note.js';
import { RollupProcessor, TokenAsset } from '@aztec/blockchain';
import { Block } from '@aztec/barretenberg/block_source';

jest.setTimeout(5 * 60 * 1000);
EventEmitter.defaultMaxListeners = 30;

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  ROLLUP_HOST = 'http://localhost:8081',
  DAI_CONTRACT_ADDRESS = '',
  ROLLUP_CONTRACT_ADDRESS = '',
} = process.env;

/**
 * Note that most of this test don't use falafel. Instead if interact directly with the contract.
 * Because the contract have an always true verifier, it accepts what we pass it.
 * This means that falafel will throw in the background, but this don't matter much to us here.
 *
 * Run the following:
 * contracts: VERIFIER_TYPE="AlwaysTrueVerifier" ./scripts/start_e2e.sh
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * end-to-end: yarn test e2e_rollup_processor.test.ts
 *
 * Running via docker:
 *
 */

describe('end-to-end rollup processor test', () => {
  let provider: WalletProvider;
  let sdk: AztecSdk;
  let addresses: EthAddress[] = [];

  let rollupProcessorAddress: EthAddress;
  let rollupProcessor: RollupProcessor;

  let daiAddress: EthAddress;
  let dai: TokenAsset;

  const debug = createDebug('bb:e2e_rollup_processor');

  const decodeRollup = (block: Block) => {
    const rollup = RollupProofData.decode(block.encodedRollupProofData);
    // Coax lazy init of txId
    rollup.innerProofData.forEach(x => x.txId);
    return rollup;
  };

  beforeAll(async () => {
    debug(`funding initial ETH accounts...`);
    const initialBalance = 2n * 10n ** 16n; // 0.02

    const testMnemonic = 'test test test test test test test test test test test junk';
    provider = await createFundedWalletProvider(ETHEREUM_HOST, 2, 2, undefined, initialBalance, testMnemonic);
    addresses = provider.getAccounts();

    // Allow direct interaction with the rollup processor
    rollupProcessorAddress = EthAddress.fromString(ROLLUP_CONTRACT_ADDRESS);
    rollupProcessor = new RollupProcessor(rollupProcessorAddress, provider);

    // Setup for Dai interactions
    daiAddress = EthAddress.fromString(DAI_CONTRACT_ADDRESS);
    dai = await TokenAsset.fromAddress(daiAddress, provider, 100000);

    sdk = await createAztecSdk(provider, {
      serverUrl: ROLLUP_HOST,
      pollInterval: 1000,
      memoryDb: true,
      minConfirmation: 1,
    });
    await sdk.run();
    await sdk.awaitSynchronised();
  });

  afterAll(async () => {
    await sdk.destroy();
  });

  it('Should process all proof types and get specified blocks', async () => {
    const inputAssetId = 1;
    const bridgeAddressId = 1;
    const tokenAAssetId = 1;
    const bridgeCallData = new BridgeCallData(bridgeAddressId, tokenAAssetId, tokenAAssetId);

    const userAAddress = addresses[1];
    const initialBalance = sdk.toBaseUnits(inputAssetId, '300');
    const depositAmount = 100n;
    const sendAmount = 6n;
    const defiDepositAmount = 6n;
    const defiOutputAmount = 100n * 10n ** 18n; // fixed inside the mock bridge to return 100 tokens
    const withdrawalAmount = 10n;

    // Number of bridge calls per rollup * number of rollups before the defi interactions
    const interactionNonce = RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK * 2;

    debug('Constructing proof with inner proofs');
    const innerProofOutputs = [
      await createDepositProof(depositAmount, userAAddress, provider, inputAssetId),
      mergeInnerProofs([createAccountProof(), createSendProof(inputAssetId, sendAmount)]),
      mergeInnerProofs([
        createDefiDepositProof(bridgeCallData, defiDepositAmount),
        createDefiDepositProof(bridgeCallData, defiDepositAmount),
      ]),
      createWithdrawProof(withdrawalAmount, userAAddress, inputAssetId),
      createDefiClaimProof(bridgeCallData),
    ];

    const note1 = new DefiInteractionNote(
      bridgeCallData,
      interactionNonce,
      defiDepositAmount,
      defiOutputAmount,
      0n,
      true,
    );
    const note2 = new DefiInteractionNote(
      bridgeCallData,
      interactionNonce + 1,
      defiDepositAmount,
      defiOutputAmount,
      0n,
      true,
    );
    const interactionResult = [note1, note2];
    const previousDefiInteractionHash = packInteractionNotes(
      interactionResult,
      RollupProofData.NUM_BRIDGE_CALLS_PER_BLOCK,
    );

    // Deposit Dai into the contract
    await sdk.mint(initialBalance, userAAddress);
    await dai.approve(depositAmount, userAAddress, rollupProcessor.address);
    await rollupProcessor.depositPendingFunds(inputAssetId, depositAmount, undefined, {
      signingAddress: userAAddress,
    });

    debug('Sending proofs');
    for (let rollupId = 0; rollupId < innerProofOutputs.length; rollupId++) {
      debug(`sending proof ${rollupId}`);
      const { encodedProofData, signatures, offchainTxData } = createRollupProof(innerProofOutputs[rollupId], {
        rollupId,
        defiInteractionData:
          rollupId === 2
            ? interactionResult.map(note => new DefiInteractionData(note.bridgeCallData, note.totalInputValue))
            : [],
        previousDefiInteractionHash: rollupId === 3 ? previousDefiInteractionHash : undefined,
      });

      const txs = await rollupProcessor.createRollupTxs(encodedProofData, signatures, offchainTxData, 300);
      const hash = await rollupProcessor.sendRollupTxs(txs);

      // Anvil is too fast. Need to wait for tx to be mined for next proof to be valid
      await rollupProcessor.getTxReceipt(hash);
      debug(`Sent proof ${rollupId} with tx hash ${hash.toString()}`);
    }

    debug('Requesting blocks');
    const blocks = await rollupProcessor.getRollupBlocksFrom(0, 1);
    expect(blocks.length).toEqual(5);

    debug('Validating blocks');
    const rollupSize = 2; // 2 transactions per rollup
    const dataNotesInserted = rollupSize * 2; // 2 notes per transaction

    for (let rollupId = 0; rollupId < blocks.length; rollupId++) {
      const { innerProofs, offchainTxData } = innerProofOutputs[rollupId];

      const block = blocks[rollupId];
      // For rollupId 2, the interaction result is not empty as there are 2 bridge calls
      expect(block).toMatchObject({
        rollupId,
        rollupSize,
        interactionResult: rollupId == 2 ? interactionResult : [],
        offchainTxData,
      });

      const rollup = decodeRollup(block);
      // dataStartIndex is offset by 8 due to the pre-loaded test accounts
      // innerProofData is padded if there is only one transaction in the innerProofs passed
      expect(rollup).toMatchObject({
        rollupId,
        dataStartIndex: 8 + rollupId * dataNotesInserted,
        innerProofData: innerProofs.length == 2 ? innerProofs : [innerProofs[0], InnerProofData.PADDING],
      });
    }
  });
});
