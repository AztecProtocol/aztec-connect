import { bufferToHex } from 'ethereumjs-util';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { evmSnapshot, evmRevert, setEthBalance } from '../../ganache/hardhat-chain-manipulation';
import { EthersAdapter } from '../../provider';
import {
    createRollupProof,
    createSendProof,
    DefiInteractionData,
} from './fixtures/create_mock_proof';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { RollupProcessor } from './rollup_processor';
import { EthAddress } from '@aztec/barretenberg/address';
import { Asset, TxHash } from '@aztec/barretenberg/blockchain';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import {
    computeInteractionHashes,
    DefiInteractionNote,
} from '@aztec/barretenberg/note_algorithms';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { keccak256, LogDescription, toUtf8Bytes } from 'ethers/lib/utils';
import { DefiInteractionEvent } from '@aztec/barretenberg/block_source/defi_interaction_event';
import { createPermitData, createPermitDataNonStandard } from '../../create_permit_data';
import { Web3Signer } from '../../signer';


const parseInteractionEventResultFromLog = (log: LogDescription) => {
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
    }

    const topupEth = async (amount: bigint) => {
        if (rollupProvider.provider) {
            await setEthBalance(rollupProcessor.address, amount +
                (await rollupProvider.provider?.getBalance(rollupProcessor.address.toString())).toBigInt()
            );
        } else {
            await setEthBalance(rollupProcessor.address, amount);
        }
    }

    const expectResult = async (expectedResultEventOrder: DefiInteractionNote[], expectedResultStorage: DefiInteractionNote[], txHash: TxHash) => {
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

        const expectedHashes = computeInteractionHashes([
            ...expectedResultStorage,
            ...[...Array(numberOfBridgeCalls - expectedResultStorage.length)].map(() => DefiInteractionNote.EMPTY),
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
    }

    beforeAll(async () => {
        const signers = await ethers.getSigners();
        [rollupProvider, ...userSigners] = signers;
        userAddresses = await Promise.all(userSigners.map(async u => EthAddress.fromString(await u.getAddress())));
        ({ assets, rollupProcessor } = await setupTestRollupProcessor(signers));

        reentryBridge = await (await ethers.getContractFactory('ReentryBridge', rollupProvider)).deploy(rollupProcessor.address.toString());
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
        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        // Add no operation to stack, calldata just used to have some bytes
        await reentryBridge.addAction(
            0,
            true,
            true,
            true,
            getCalldata('processAsyncDefiInteraction(uint256)', 0),
            amount,
            0
        );

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
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
                0
            );

            const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
                rollupId: 1,
                defiInteractionData: [new DefiInteractionData(bridgeId, amount)],
            });

            const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
            const txHash = await rollupProcessor.sendTx(tx);

            const interactions = [
                new DefiInteractionEvent(bridgeId, 0, amount, amount, 0n, true, Buffer.alloc(0)),
                new DefiInteractionEvent(bridgeId, 32, amount, amount, 0n, true, Buffer.alloc(0)),
            ];
            const interactionsStorage = [interactions[1], interactions[0]];
            await expectResult(interactions, interactionsStorage, txHash);
        }
    });

    it('should be able to reenter process async defi interaction from async defi interaction inside rollup', async () => {
        // When using async. Recall that events and storage updates might not be the same order.
        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        // Add no operation to stack, calldata just used to have some bytes
        await reentryBridge.addAction(
            0,
            true,
            true,
            true,
            '0x',
            amount,
            0
        );
        await reentryBridge.addAction(
            1,
            true,
            true,
            false,
            getCalldata('processAsyncDefiInteraction(uint256)', 0),
            amount,
            0
        );

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [
                new DefiInteractionData(bridgeId, amount),
                new DefiInteractionData(bridgeId, amount)
            ]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
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
                0
            );

            const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
                rollupId: 1,
                defiInteractionData: [new DefiInteractionData(bridgeId, amount)],
            });

            const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
            const txHash = await rollupProcessor.sendTx(tx);

            const interactions = [
                new DefiInteractionEvent(bridgeId, 0, amount, amount, 0n, true, Buffer.alloc(0)),
                new DefiInteractionEvent(bridgeId, 1, amount, amount, 0n, true, Buffer.alloc(0)),
                new DefiInteractionEvent(bridgeId, 32, amount, amount, 0n, true, Buffer.alloc(0)),
            ];
            const interactionsStorage = [interactions[2], interactions[0], interactions[1]];
            await expectResult(interactions, interactionsStorage, txHash);
        }
    });

    it('should revert when reenter processRollup from async defi interaction inside rollup', async () => {
        // When using async. Recall that events and storage updates might not be the same order.
        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        // Add processRollup action inside an async operation
        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            getCalldata('processRollup(bytes,bytes)', '0x', '0x'),
            amount,
            0
        );

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [
                new DefiInteractionData(bridgeId, amount)
            ]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
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
                0
            );

            const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
                rollupId: 1,
                defiInteractionData: [new DefiInteractionData(bridgeId, amount)],
            });

            const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
            const txHash = await rollupProcessor.sendTx(tx);

            // Notice, there will never be an event for the "inner" async, because it will fail before emitting the event.
            const interactions = [
                new DefiInteractionEvent(bridgeId, 32, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()')),
            ];
            const interactionsStorage = interactions;
            await expectResult(interactions, interactionsStorage, txHash);
        }
    });

    it('should revert when reentering deposit from rollup', async () => {
        const assetId = 0;
        const owner = userAddresses[0];
        const proofHash = Buffer.alloc(32);
        const calldata = getCalldata('depositPendingFunds(uint256,uint256,address,bytes32)', assetId, amount, owner.toString(), bufferToHex(proofHash));

        // Add action to stack
        await reentryBridge.addAction(
            0,
            false,
            false,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
        await expectResult(interactions, interactions, txHash);
    });

    it('should revert when reentering deposit with standard permit from rollup', async () => {
        const depositAmount = 60n;
        const chainId = 31337;
        const asset = assets[1];
        const depositor = userAddresses[0];
        const deadline = 0xffffffffn;
        const nonce = await asset.getUserNonce(depositor);
        const proofHash = Buffer.alloc(32);
        const name = asset.getStaticInfo().name;
        const permitData = createPermitData(
            name,
            depositor,
            rollupProcessor.address,
            depositAmount,
            nonce,
            deadline,
            asset.getStaticInfo().address,
            chainId,
        );
        const signer = new Web3Signer(new EthersAdapter(ethers.provider));
        const signature = await signer.signTypedData(permitData, depositor);

        const calldata = getCalldata('depositPendingFundsPermit(uint256,uint256,address,bytes32,uint256,uint8,bytes32,bytes32)',
            1,
            depositAmount,
            depositor.toString(),
            proofHash,
            deadline,
            signature.v,
            signature.r,
            signature.s
        );

        await reentryBridge.addAction(
            0,
            false,
            false,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
        await expectResult(interactions, interactions, txHash);

        expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).toBe(0n);
        expect(await asset.getUserNonce(depositor)).toBe(nonce);
    });

    it('should revert when reentering deposit with non-standard permit from rollup', async () => {
        const depositAmount = 60n;
        const chainId = 31337;
        const assetId = 1;
        const asset = assets[assetId];
        const depositor = userAddresses[0];
        const deadline = 0xffffffffn;
        const proofHash = Buffer.alloc(32);
        const nonce = await asset.getUserNonce(depositor);
        const name = asset.getStaticInfo().name;
        const permitData = createPermitDataNonStandard(
            name,
            depositor,
            rollupProcessor.address,
            nonce,
            deadline,
            asset.getStaticInfo().address,
            chainId,
        );
        const signer = new Web3Signer(new EthersAdapter(ethers.provider));
        const signature = await signer.signTypedData(permitData, depositor);

        const calldata = getCalldata('depositPendingFundsPermitNonStandard(uint256,uint256,address,bytes32,uint256,uint256,uint8,bytes32,bytes32)',
            1,
            depositAmount,
            depositor.toString(),
            proofHash,
            nonce,
            deadline,
            signature.v,
            signature.r,
            signature.s
        );

        await reentryBridge.addAction(
            0,
            false,
            false,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
        await expectResult(interactions, interactions, txHash);

        expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).toBe(0n);
        expect(await asset.getUserNonce(depositor)).toBe(nonce);
    });

    it('should revert when reentering set supported bridge from rollup', async () => {
        const owner = userAddresses[0];
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: EthAddress.fromString(await rollupProvider.getAddress()) }));

        const calldata = getCalldata('setSupportedBridge(address,uint256)', owner.toString(), 50000);

        // Add action to stack
        await reentryBridge.addAction(
            0,
            false,
            false,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
        await expectResult(interactions, interactions, txHash);
    });

    it('should revert when reentering set supported asset from rollup', async () => {
        const owner = userAddresses[0];
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: EthAddress.fromString(await rollupProvider.getAddress()) }));

        await reentryBridge.addAction(
            0,
            false,
            false,
            false,
            getCalldata('setSupportedAsset(address,uint256)', owner.toString(), 50000),
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
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
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions = [new DefiInteractionEvent(bridgeId, 0, amount, 0n, 0n, false, formatCustomErrorMsg('LOCKED_NO_REENTER()'))];
        await expectResult(interactions, interactions, txHash);
    });

    it('should revert when reentering deposit from async', async () => {
        const assetId = 0;
        const owner = userAddresses[0];
        const proofHash = Buffer.alloc(32);
        const calldata = getCalldata('depositPendingFunds(uint256,uint256,address,bytes32)', assetId, amount, owner.toString(), bufferToHex(proofHash));

        // Add action to stack
        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions: DefiInteractionEvent[] = [];
        await expectResult(interactions, interactions, txHash);

        await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
    });

    it('should revert when reentering deposit with standard permit from async', async () => {
        const depositAmount = 60n;
        const chainId = 31337;
        const asset = assets[1];
        const depositor = userAddresses[0];
        const deadline = 0xffffffffn;
        const nonce = await asset.getUserNonce(depositor);
        const proofHash = Buffer.alloc(32);
        const name = asset.getStaticInfo().name;
        const permitData = createPermitData(
            name,
            depositor,
            rollupProcessor.address,
            depositAmount,
            nonce,
            deadline,
            asset.getStaticInfo().address,
            chainId,
        );
        const signer = new Web3Signer(new EthersAdapter(ethers.provider));
        const signature = await signer.signTypedData(permitData, depositor);

        const calldata = getCalldata('depositPendingFundsPermit(uint256,uint256,address,bytes32,uint256,uint8,bytes32,bytes32)',
            1,
            depositAmount,
            depositor.toString(),
            proofHash,
            deadline,
            signature.v,
            signature.r,
            signature.s
        );

        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);

        const interactions: DefiInteractionEvent[] = [];
        await expectResult(interactions, interactions, txHash);

        await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');

        expect(await rollupProcessor.getUserPendingDeposit(1, depositor)).toBe(0n);
        expect(await asset.getUserNonce(depositor)).toBe(nonce);
    });

    it('should revert when reentering deposit with non-standard permit from async', async () => {
        const depositAmount = 60n;
        const chainId = 31337;
        const assetId = 1;
        const asset = assets[assetId];
        const depositor = userAddresses[0];
        const deadline = 0xffffffffn;
        const proofHash = Buffer.alloc(32);
        const nonce = await asset.getUserNonce(depositor);
        const name = asset.getStaticInfo().name;
        const permitData = createPermitDataNonStandard(
            name,
            depositor,
            rollupProcessor.address,
            nonce,
            deadline,
            asset.getStaticInfo().address,
            chainId,
        );
        const signer = new Web3Signer(new EthersAdapter(ethers.provider));
        const signature = await signer.signTypedData(permitData, depositor);

        const calldata = getCalldata('depositPendingFundsPermitNonStandard(uint256,uint256,address,bytes32,uint256,uint256,uint8,bytes32,bytes32)',
            1,
            depositAmount,
            depositor.toString(),
            proofHash,
            nonce,
            deadline,
            signature.v,
            signature.r,
            signature.s
        );

        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions: DefiInteractionEvent[] = [];
        await expectResult(interactions, interactions, txHash);

        await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');

        expect(await rollupProcessor.getUserPendingDeposit(assetId, depositor)).toBe(0n);
        expect(await asset.getUserNonce(depositor)).toBe(nonce);
    });

    it('should revert when reentering set supported bridge from async', async () => {
        const owner = userAddresses[0];
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: EthAddress.fromString(await rollupProvider.getAddress()) }));

        const calldata = getCalldata('setSupportedBridge(address,uint256)', owner.toString(), 50000);

        // Add action to stack
        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions: DefiInteractionEvent[] = [];
        await expectResult(interactions, interactions, txHash);

        await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
    });

    it('should revert when reentering set supported asset from async', async () => {
        const owner = userAddresses[0];
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: EthAddress.fromString(await rollupProvider.getAddress()) }));

        const calldata = getCalldata('setSupportedAsset(address,uint256)', owner.toString(), 50000);

        // Add action to stack
        await reentryBridge.addAction(
            0,
            true,
            true,
            false,
            calldata,
            amount,
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
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
            0
        );

        const bridgeId = new BridgeId(bridgeAddressId, 0, 0);

        const { proofData } = await createRollupProof(rollupProvider, dummyProof(), {
            defiInteractionData: [new DefiInteractionData(bridgeId, amount)]
        });

        const tx = await rollupProcessor.createRollupProofTx(proofData, [], []);
        const txHash = await rollupProcessor.sendTx(tx);
        const interactions: DefiInteractionEvent[] = [];
        await expectResult(interactions, interactions, txHash);

        await expect(rollupProcessor.processAsyncDefiInteraction(0)).rejects.toThrow('LOCKED_NO_REENTER()');
    });

    it('should revert when re-entering from deposit', async () => {
        const reenterToken = await (await ethers.getContractFactory('ERC20Reenter', rollupProvider)).deploy();

        await rollupProcessor.setSupportedAsset(EthAddress.fromString(reenterToken.address), 1000000);
        const assetId = (await rollupProcessor.getSupportedAssets()).length;

        await expect(rollupProcessor.depositPendingFunds(assetId, 0n)).rejects.toThrow('LOCKED_NO_REENTER')
    })
});  