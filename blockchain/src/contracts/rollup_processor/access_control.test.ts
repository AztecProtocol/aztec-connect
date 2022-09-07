// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { Signer } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  evmRevert,
  evmSnapshot,
  advanceBlocksHardhat,
  blocksToAdvanceHardhat,
} from '../../ganache/hardhat_chain_manipulation';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
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
  const LISTER_ROLE = keccak256(toUtf8Bytes('LISTER_ROLE'));
  const RESUME_ROLE = keccak256(toUtf8Bytes('RESUME_ROLE'));

  before(async () => {
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
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.pause({ signingAddress: addresses[0] }));

    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  it('holder of EMERGENCY_ROLE should not be able to pause if already paused', async () => {
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.pause({ signingAddress: addresses[0] }));

    expect(await rollupProcessor.paused()).to.be.eq(true);

    await expect(rollupProcessor.pause({ signingAddress: addresses[0] })).to.be.revertedWith(`PAUSED`);

    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  it('holder of OWNER_ROLE but not EMERGENCY_ROLE should not be able to pause', async () => {
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.revokeRole(EMERGENCY_ROLE, addresses[0], { signingAddress: addresses[0] }));
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, addresses[0])).to.be.eq(false);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).to.be.eq(true);

    expect(await rollupProcessor.paused()).to.be.eq(false);

    await expect(rollupProcessor.pause({ signingAddress: addresses[0] })).to.be.revertedWith(
      `AccessControl: account ${addresses[0].toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
    );

    expect(await rollupProcessor.paused()).to.be.eq(false);
  });

  it('non-holder of EMERGENCY_ROLE should not be able to pause', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    await expect(rollupProcessor.pause({ signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
    );

    expect(await rollupProcessor.paused()).to.be.eq(false);
  });

  it('admin of EMERGENCY_ROLE can grant EMERGENCY_ROLE and user should be able to pause', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] }));

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.pause({ signingAddress: userAddress }));

    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  it('admin of EMERGENCY_ROLE can revoke EMERGENCY_ROLE and user should be unable to pause', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.revokeRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] }));

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.paused()).to.be.eq(false);

    await expect(rollupProcessor.pause({ signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${EMERGENCY_ROLE}`,
    );

    expect(await rollupProcessor.paused()).to.be.eq(false);
  });

  it('holder of RESUME_ROLE can unpause when paused', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.paused()).to.be.eq(false);
    expect(await rollupProcessor.pause({ signingAddress: userAddress }));
    expect(await rollupProcessor.paused()).to.be.eq(true);

    expect(await rollupProcessor.hasRole(RESUME_ROLE, userAddress)).to.be.eq(true);

    expect(await rollupProcessor.unpause({ signingAddress: userAddress }));

    expect(await rollupProcessor.paused()).to.be.eq(false);
  });

  it('holder of RESUME_ROLE cannot unpause when unpaused', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.paused()).to.be.eq(false);

    expect(await rollupProcessor.hasRole(RESUME_ROLE, userAddress)).to.be.eq(true);

    await expect(rollupProcessor.unpause({ signingAddress: userAddress })).to.be.revertedWith('NOT_PAUSED');

    expect(await rollupProcessor.paused()).to.be.eq(false);
  });

  it('holder of only EMERGENCY_ROLE cannot unpause when paused', async () => {
    const userAddress = addresses[1];

    expect(await rollupProcessor.paused()).to.be.eq(false);
    expect(await rollupProcessor.pause({ signingAddress: addresses[0] }));
    expect(await rollupProcessor.paused()).to.be.eq(true);
    expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: addresses[0] }));

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(RESUME_ROLE, userAddress)).to.be.eq(false);
    await expect(rollupProcessor.unpause({ signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${RESUME_ROLE}`,
    );

    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  it('holder of only OWNER_ROLE cannot unpause when paused', async () => {
    const userAddress = addresses[1];

    expect(await rollupProcessor.paused()).to.be.eq(false);
    expect(await rollupProcessor.pause({ signingAddress: addresses[0] }));
    expect(await rollupProcessor.paused()).to.be.eq(true);
    expect(await rollupProcessor.grantRole(OWNER_ROLE, userAddress, { signingAddress: addresses[0] }));

    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(RESUME_ROLE, userAddress)).to.be.eq(false);
    await expect(rollupProcessor.unpause({ signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${RESUME_ROLE}`,
    );

    expect(await rollupProcessor.paused()).to.be.eq(true);
  });

  it('holder of OWNER_ROLE can set rollup provider', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(true);

    expect(await rollupProcessor.setRollupProvider(userAddress, false, { signingAddress: userAddress }));
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(false);

    expect(await rollupProcessor.setRollupProvider(userAddress, true, { signingAddress: userAddress }));
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(true);
  });

  it('non-holder of OWNER_ROLE cannot set rollup provider', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(false);

    await expect(
      rollupProcessor.setRollupProvider(userAddress, true, { signingAddress: userAddress }),
    ).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(false);

    await expect(
      rollupProcessor.setRollupProvider(userAddress, false, { signingAddress: userAddress }),
    ).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );
    expect(await rollupProcessor.rollupProviders(userAddress)).to.be.eq(false);
  });

  it('holder of OWNER_ROLE can set verifier', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
    const verifier = await rollupProcessor.verifier();

    expect(await rollupProcessor.setVerifier(userAddress, { signingAddress: userAddress }));
    expect(await rollupProcessor.verifier()).to.be.eql(userAddress);
    expect(await rollupProcessor.verifier()).not.to.be.eql(verifier);
  });

  it('non-holder of OWNER_ROLE cannot set verifier', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(false);
    const verifier = await rollupProcessor.verifier();

    await expect(rollupProcessor.setVerifier(userAddress, { signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );

    expect(await rollupProcessor.verifier()).not.to.be.eql(userAddress);
    expect(await rollupProcessor.verifier()).to.be.eql(verifier);
  });

  it('holder of OWNER_ROLE can set allow third party contracts', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);

    expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: userAddress }));
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(true);

    expect(await rollupProcessor.setThirdPartyContractStatus(false, { signingAddress: userAddress }));
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);
  });

  it('non-holder of OWNER_ROLE cannot set allow third party contracts', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);

    await expect(rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);
  });

  it('holder of OWNER_ROLE can set defi bridge proxy', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
    const defiBridgeProxy = await rollupProcessor.defiBridgeProxy();

    expect(await rollupProcessor.setDefiBridgeProxy(userAddress, { signingAddress: userAddress }));
    expect(await rollupProcessor.defiBridgeProxy()).to.be.eql(userAddress);
    expect(await rollupProcessor.defiBridgeProxy()).not.to.be.eql(defiBridgeProxy);
  });

  it('non-holder of OWNER_ROLE cannot set defi bridge proxy', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(false);
    const defiBridgeProxy = await rollupProcessor.defiBridgeProxy();

    await expect(rollupProcessor.setDefiBridgeProxy(userAddress, { signingAddress: userAddress })).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${OWNER_ROLE}`,
    );

    expect(await rollupProcessor.defiBridgeProxy()).not.to.be.eql(userAddress);
    expect(await rollupProcessor.defiBridgeProxy()).to.be.eql(defiBridgeProxy);
  });

  it('holder of LISTER_ROLE can set supported asset', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);

    await rollupProcessor.grantRole(LISTER_ROLE, userAddress);

    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(true);

    const supportedBefore = await rollupProcessor.getSupportedAssets();

    expect(await rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress }));
    const supportedAfter = await rollupProcessor.getSupportedAssets();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length + 1);
  });

  it('holder of LISTER_ROLE cannot set supported asset to zero', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(true);

    const supportedBefore = await rollupProcessor.getSupportedAssets();

    await expect(
      rollupProcessor.setSupportedAsset(EthAddress.ZERO, 1, { signingAddress: userAddress }),
    ).to.be.revertedWith(`INVALID_LINKED_TOKEN_ADDRESS`);

    const supportedAfter = await rollupProcessor.getSupportedAssets();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length);
  });

  it('anyone can set supported asset if third party allowed', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);

    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);
    expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: addresses[0] }));
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(true);
    const supportedBefore = await rollupProcessor.getSupportedAssets();

    expect(await rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress }));
    const supportedAfter = await rollupProcessor.getSupportedAssets();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length + 1);
  });

  it('non-holder of LISTER_ROLE cannot set supported asset if third party disallowed', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);

    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);

    const supportedBefore = await rollupProcessor.getSupportedAssets();

    await expect(rollupProcessor.setSupportedAsset(userAddress, 1, { signingAddress: userAddress })).to.be.revertedWith(
      `THIRD_PARTY_CONTRACTS_FLAG_NOT_SET`,
    );

    const supportedAfter = await rollupProcessor.getSupportedAssets();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length);
  });

  it('holder of LISTER_ROLE can set supported bridge', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);
    await rollupProcessor.grantRole(LISTER_ROLE, userAddress);
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(true);

    const supportedBefore = await rollupProcessor.getSupportedBridges();

    expect(await rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress }));
    const supportedAfter = await rollupProcessor.getSupportedBridges();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length + 1);
  });

  it('holder of LISTER_ROLE cannot set supported bridge to address(0)', async () => {
    const userAddress = addresses[0];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(true);

    const supportedBefore = await rollupProcessor.getSupportedBridges();

    await expect(
      rollupProcessor.setSupportedBridge(EthAddress.ZERO, 1, { signingAddress: userAddress }),
    ).to.be.revertedWith(`INVALID_LINKED_BRIDGE_ADDRESS`);

    const supportedAfter = await rollupProcessor.getSupportedBridges();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length);
  });

  it('anyone can set supported bridge if third party allowed', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);

    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);
    expect(await rollupProcessor.setThirdPartyContractStatus(true, { signingAddress: addresses[0] }));
    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(true);
    const supportedBefore = await rollupProcessor.getSupportedBridges();

    expect(await rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress }));
    const supportedAfter = await rollupProcessor.getSupportedBridges();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length + 1);
  });

  it('non-holder of LISTER_ROLE cannot set supported bridge if third party disallowed', async () => {
    const userAddress = addresses[1];
    expect(await rollupProcessor.hasRole(LISTER_ROLE, userAddress)).to.be.eq(false);

    expect(await rollupProcessor.getThirdPartyContractStatus()).to.be.eq(false);

    const supportedBefore = await rollupProcessor.getSupportedBridges();

    await expect(
      rollupProcessor.setSupportedBridge(userAddress, 1, { signingAddress: userAddress }),
    ).to.be.revertedWith(`THIRD_PARTY_CONTRACTS_FLAG_NOT_SET`);

    const supportedAfter = await rollupProcessor.getSupportedBridges();

    expect(supportedAfter.length).to.be.eq(supportedBefore.length);
  });

  it('non-holder of DEFAULT_ADMIN_ROLE cannot add people to roles', async () => {
    const adminAddress = addresses[0];
    const userAddress = addresses[1];

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).to.be.eq(false);

    await expect(
      rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: userAddress }),
    ).to.be.revertedWith(
      `AccessControl: account ${userAddress.toString().toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`,
    );

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).to.be.eq(false);
  });

  it('holder of DEFAULT_ADMIN_ROLE adds new admin, who updates other roles', async () => {
    const adminAddress = addresses[0];
    const userAddress = addresses[1];

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, adminAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(false);

    // Get admin role
    expect(await rollupProcessor.grantRole(DEFAULT_ADMIN_ROLE, userAddress, { signingAddress: adminAddress }));

    // Revoke old roles, held by the old admin
    expect(await rollupProcessor.revokeRole(DEFAULT_ADMIN_ROLE, adminAddress, { signingAddress: userAddress }));
    expect(await rollupProcessor.revokeRole(OWNER_ROLE, adminAddress, { signingAddress: userAddress }));
    expect(await rollupProcessor.revokeRole(EMERGENCY_ROLE, adminAddress, { signingAddress: userAddress }));

    // Add new roles to self
    expect(await rollupProcessor.grantRole(EMERGENCY_ROLE, userAddress, { signingAddress: userAddress }));
    expect(await rollupProcessor.grantRole(OWNER_ROLE, userAddress, { signingAddress: userAddress }));

    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, adminAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(EMERGENCY_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(DEFAULT_ADMIN_ROLE, userAddress)).to.be.eq(true);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, adminAddress)).to.be.eq(false);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, userAddress)).to.be.eq(true);
  });

  it('owner of permit helper can kill it', async () => {
    const permitHelper = rollupProcessor.getHelperContractWithSigner({ signingAddress: addresses[0] });
    expect(await permitHelper.ROLLUP_PROCESSOR()).to.be.eql(rollupProcessor.address.toString());
    expect(await permitHelper.kill());
    await expect(permitHelper.ROLLUP_PROCESSOR()).to.be.reverted;
  });

  it('non owner of permit helper cannot kill it', async () => {
    const permitHelper = rollupProcessor.getHelperContractWithSigner({ signingAddress: addresses[1] });
    expect(await permitHelper.ROLLUP_PROCESSOR()).to.be.eql(rollupProcessor.address.toString());
    await expect(permitHelper.kill()).to.be.revertedWith('Ownable: caller is not the owner');
    expect(await permitHelper.ROLLUP_PROCESSOR()).to.be.eql(rollupProcessor.address.toString());
  });
});
