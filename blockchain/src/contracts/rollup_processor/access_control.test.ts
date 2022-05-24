import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { evmRevert, evmSnapshot, advanceBlocksHardhat, blocksToAdvanceHardhat } from '../../ganache/hardhat-chain-manipulation'
import { setupTestRollupProcessor, } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';

describe('rollup_processor_access_control', () => {
    let rollupProcessor: TestRollupProcessor;
    let signers: Signer[];
    let addresses: EthAddress[];

    let snapshot: string;

    const escapeBlockLowerBound = 80;
    const escapeBlockUpperBound = 100;

    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const EMERGENCY_ROLE = keccak256(toUtf8Bytes('EMERGENCY_ROLE'));
    const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));

    beforeAll(async () => {
        signers = await ethers.getSigners();
        addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
        ({ rollupProcessor } = await setupTestRollupProcessor(signers, {
            numberOfTokenAssets: 1,
            escapeBlockLowerBound,
            escapeBlockUpperBound,
        }));
        // Advance into block region where escapeHatch is active.
        const blocks = await blocksToAdvanceHardhat(escapeBlockLowerBound, escapeBlockUpperBound, ethers.provider);
        await advanceBlocksHardhat(blocks, ethers.provider);
    });

    beforeEach(async () => {
        snapshot = await evmSnapshot();
    });

    afterEach(async () => {
        await evmRevert(snapshot);
    });

    it('holder of EMERGENCY_ROLE should be able to pause', async () => {
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).toBe(true);
        expect(await rollupProcessor.paused()).toBe(false);

        expect(await rollupProcessor.pause({ signingAddress: addresses[0] })).toBeTruthy();

        expect(await rollupProcessor.paused()).toBe(true);
    });

    it('holder of EMERGENCY_ROLE should not be able to pause if already paused', async () => {
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).toBe(true);
        expect(await rollupProcessor.pause({ signingAddress: addresses[0] })).toBeTruthy();

        expect(await rollupProcessor.paused()).toBe(true);

        await expect(rollupProcessor.pause({ signingAddress: addresses[0] })).rejects.toThrow(`PAUSED`);

        expect(await rollupProcessor.paused()).toBe(true);
    });

    it('holder of OWNER_ROLE but not EMERGENCY_ROLE should not be able to pause', async () => {
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).toBe(true);
        expect(await rollupProcessor.revokeRole(EMERGENCY_ROLE, addresses[0], { signingAddress: addresses[0] }));
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).toBe(false);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).toBe(true);

        expect(await rollupProcessor.paused()).toBe(false);

        await expect(rollupProcessor.pause({ signingAddress: addresses[0] })).rejects.toThrow(
            `AccessControl: account ${addresses[0].toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
        );

        expect(await rollupProcessor.paused()).toBe(false);
    });

    it('non-holder of EMERGENCY_ROLE should not be able to pause', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.paused()).toBe(false);

        await expect(rollupProcessor.pause({ signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
        );

        expect(await rollupProcessor.paused()).toBe(false);
    });

    it('admin of EMERGENCY_ROLE can grant EMERGENCY_ROLE and user should be able to pause', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, addresses[0])).toBe(true);
        expect(await rollupProcessor.paused()).toBe(false);

        expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] })).toBeTruthy();

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.paused()).toBe(false);

        expect(await rollupProcessor.pause({ signingAddress: userAddress })).toBeTruthy();

        expect(await rollupProcessor.paused()).toBe(true);
    });

    it('admin of EMERGENCY_ROLE can revoke EMERGENCY_ROLE and user should be unable to pause', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, addresses[0])).toBe(true);
        expect(await rollupProcessor.paused()).toBe(false);

        expect(
            await rollupProcessor.revokeRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] }),
        ).toBeTruthy();

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.paused()).toBe(false);

        await expect(rollupProcessor.pause({ signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
        );

        expect(await rollupProcessor.paused()).toBe(false);
    });

    it('holder of OWNER_ROLE can unpause when paused', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.paused()).toBe(false);
        expect(await rollupProcessor.pause({ signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.paused()).toBe(true);

        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        expect(await rollupProcessor.unpause({ signingAddress: userAddress })).toBeTruthy();

        expect(await rollupProcessor.paused()).toBe(false);
    });

    it('holder of OWNER_ROLE cannot unpause when paused', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.paused()).toBe(false);

        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        await expect(rollupProcessor.unpause({ signingAddress: userAddress })).rejects.toThrow('NOT_PAUSED');

        expect(await rollupProcessor.paused()).toBe(false);
    });

    it('holder of only EMERGENCY_ROLE cannot unpause when paused', async () => {
        const userAddress = addresses[1];

        expect(await rollupProcessor.paused()).toBe(false);
        expect(await rollupProcessor.pause({ signingAddress: addresses[0] })).toBeTruthy();
        expect(await rollupProcessor.paused()).toBe(true);
        expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] }));

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        await expect(rollupProcessor.unpause({ signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );

        expect(await rollupProcessor.paused()).toBe(true);

    })

    it('non-holder of OWNER_ROLE cannot unpause when paused', async () => {
        const userAddress = addresses[1];

        expect(await rollupProcessor.paused()).toBe(false);
        expect(await rollupProcessor.pause({ signingAddress: addresses[0] })).toBeTruthy();
        expect(await rollupProcessor.paused()).toBe(true);

        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        await expect(rollupProcessor.unpause({ signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );

        expect(await rollupProcessor.paused()).toBe(true);
    });

    it('holder of OWNER_ROLE can set rollup provider', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(true);

        expect(await rollupProcessor.setRollupProvider(userAddress, false, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(false);

        expect(await rollupProcessor.setRollupProvider(userAddress, true, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(true);
    });

    it('non-holder of OWNER_ROLE cannot set rollup provider', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(false);

        await expect(rollupProcessor.setRollupProvider(userAddress, true, { signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(false);

        await expect(
            rollupProcessor.setRollupProvider(userAddress, false, { signingAddress: userAddress }),
        ).rejects.toThrow(`AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`);
        expect(await rollupProcessor.rollupProviders(userAddress)).toBe(false);
    });

    it('holder of OWNER_ROLE can set verifier', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);
        const verifier = await rollupProcessor.verifier();

        expect(await rollupProcessor.setVerifier(userAddress, { signingAddress: userAddress })).toBeTruthy();

        expect(await rollupProcessor.verifier()).toStrictEqual(userAddress);
        expect(await rollupProcessor.verifier()).not.toStrictEqual(verifier);
    });

    it('non-holder of OWNER_ROLE cannot set verifier', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        const verifier = await rollupProcessor.verifier();

        await expect(rollupProcessor.setVerifier(userAddress, { signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );

        expect(await rollupProcessor.verifier()).not.toStrictEqual(userAddress);
        expect(await rollupProcessor.verifier()).toStrictEqual(verifier);
    });

    it('holder of OWNER_ROLE can set allow third party contracts', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);

        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(true);

        expect(await rollupProcessor.setThirdPartyContractStatus(false, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);
    });

    it('non-holder of OWNER_ROLE cannot set allow third party contracts', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);

        await expect(rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);
    });

    it('holder of OWNER_ROLE can set defi bridge proxy', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);
        const defiBridgeProxy = await rollupProcessor.defiBridgeProxy();

        expect(await rollupProcessor.setDefiBridgeProxy(userAddress, { signingAddress: userAddress })).toBeTruthy();

        expect(await rollupProcessor.defiBridgeProxy()).toStrictEqual(userAddress);
        expect(await rollupProcessor.defiBridgeProxy()).not.toStrictEqual(defiBridgeProxy);
    });

    it('non-holder of OWNER_ROLE cannot set defi bridge proxy', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);
        const defiBridgeProxy = await rollupProcessor.defiBridgeProxy();

        await expect(rollupProcessor.setDefiBridgeProxy(userAddress, { signingAddress: userAddress })).rejects.toThrow(
            `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
        );

        expect(await rollupProcessor.defiBridgeProxy()).not.toStrictEqual(userAddress);
        expect(await rollupProcessor.defiBridgeProxy()).toStrictEqual(defiBridgeProxy);
    });

    it('holder of OWNER_ROLE can set supported asset', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedAssets();

        expect(await rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress })).toBeTruthy();

        const supportedAfter = await rollupProcessor.getSupportedAssets();

        expect(supportedAfter.length).toBe(supportedBefore.length + 1);
    });

    it('holder of OWNER_ROLE can set supported asset', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedAssets();

        await expect(
            rollupProcessor.setSupportedAsset(EthAddress.ZERO, 1, { signingAddress: userAddress }),
        ).rejects.toThrow(`INVALID_LINKED_TOKEN_ADDRESS`);

        const supportedAfter = await rollupProcessor.getSupportedAssets();

        expect(supportedAfter.length).toBe(supportedBefore.length);
    });

    it('anyone can set supported asset if third party allowed', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);

        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: addresses[0] })).toBeTruthy();
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedAssets();

        expect(await rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress })).toBeTruthy();

        const supportedAfter = await rollupProcessor.getSupportedAssets();

        expect(supportedAfter.length).toBe(supportedBefore.length + 1);
    });

    it('non-holder of OWNER_ROLE cannot set supported asset if third party disallowed', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);

        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);

        const supportedBefore = await rollupProcessor.getSupportedAssets();

        await expect(rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress })).rejects.toThrow(
            `THIRD_PARTY_CONTRACTS_FLAG_NOT_SET`,
        );

        const supportedAfter = await rollupProcessor.getSupportedAssets();

        expect(supportedAfter.length).toBe(supportedBefore.length);
    });

    it('holder of OWNER_ROLE can set supported bridge', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedBridges();

        expect(await rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress })).toBeTruthy();

        const supportedAfter = await rollupProcessor.getSupportedBridges();

        expect(supportedAfter.length).toBe(supportedBefore.length + 1);
    });

    it('holder of OWNER_ROLE cannot set supported bridge to address(0)', async () => {
        const userAddress = addresses[0];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedBridges();

        await expect(
            rollupProcessor.setSupportedBridge(EthAddress.ZERO, 1, { signingAddress: userAddress }),
        ).rejects.toThrow(`INVALID_LINKED_BRIDGE_ADDRESS`);

        const supportedAfter = await rollupProcessor.getSupportedBridges();

        expect(supportedAfter.length).toBe(supportedBefore.length);
    });

    it('anyone can set supported bridge if third party allowed', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);

        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);
        expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: addresses[0] })).toBeTruthy();
        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(true);

        const supportedBefore = await rollupProcessor.getSupportedBridges();

        expect(await rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress })).toBeTruthy();

        const supportedAfter = await rollupProcessor.getSupportedBridges();

        expect(supportedAfter.length).toBe(supportedBefore.length + 1);
    });

    it('non-holder of OWNER_ROLE cannot set supported bridge if third party disallowed', async () => {
        const userAddress = addresses[1];
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);

        expect(await rollupProcessor.getThirdPartyContractStatus()).toBe(false);

        const supportedBefore = await rollupProcessor.getSupportedBridges();

        await expect(rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress })).rejects.toThrow(
            `THIRD_PARTY_CONTRACTS_FLAG_NOT_SET`,
        );

        const supportedAfter = await rollupProcessor.getSupportedBridges();

        expect(supportedAfter.length).toBe(supportedBefore.length);
    });

    it('non-holder of DEFAULT_ADMIN_ROLE cannot add people to roles', async () => {
        const adminAddress = addresses[0];
        const userAddress = addresses[1];

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).toBe(false);

        await expect(rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: userAddress })).rejects.toThrow(`AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`);

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).toBe(false);
    });

    it('holder of DEFAULT_ADMIN_ROLE adds new admin, who updates other roles', async () => {
        const adminAddress = addresses[0];
        const userAddress = addresses[1];

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, adminAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(false);

        // Get admin role
        expect(await rollupProcessor.grantRole(DEFAULT_ADMIN_ROLE, userAddress, { signingAddress: adminAddress })).toBeTruthy();

        // Revoke old roles, held by the old admin
        expect(await rollupProcessor.revokeRole(DEFAULT_ADMIN_ROLE, adminAddress, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.revokeRole(OWNER_ROLE, adminAddress, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.revokeRole(EMERGENCY_ROLE, adminAddress, { signingAddress: userAddress })).toBeTruthy();

        // Add new roles to self
        expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: userAddress })).toBeTruthy();
        expect(await rollupProcessor.grantRole(OWNER_ROLE, userAddress, { signingAddress: userAddress })).toBeTruthy();

        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).toBe(true);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, adminAddress)).toBe(false);
        expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).toBe(true);
    });
});