// eslint-disable-next-line @typescript-eslint/no-var-requires
const { solidity } = require('ethereum-waffle');
import chai from 'chai';

import { expect } from 'chai';
chai.use(solidity);

import { EthAddress } from '@aztec/barretenberg/address';
import { BigNumber, Signer } from 'ethers';
import { formatBytes32String, keccak256, toUtf8Bytes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import {
  evmRevert,
  evmSnapshot,
  advanceBlocksHardhat,
  blocksToAdvanceHardhat,
} from '../../ganache/hardhat_chain_manipulation';
import { ProxyAdmin } from './proxy_admin';
import { setupTestRollupProcessor } from './fixtures/setup_upgradeable_test_rollup_processor';
import { TestRollupProcessor } from './fixtures/test_rollup_processor';
import { EthersAdapter } from '../../provider';
import { TestUpgradeRollupProcessor } from './fixtures/test_upgrade_rollup_processor';

describe('rollup_processor: upgradable test', () => {
  let rollupProcessor: TestUpgradeRollupProcessor;
  let proxyAdmin: ProxyAdmin;
  let signers: Signer[];
  let addresses: EthAddress[];

  let snapshot: string;

  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  const OWNER_ROLE = keccak256(toUtf8Bytes('OWNER_ROLE'));

  before(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));
    let rp: TestRollupProcessor;

    ({ proxyAdmin, rollupProcessor: rp } = await setupTestRollupProcessor(signers, {
      numberOfTokenAssets: 1,
      escapeBlockLowerBound,
      escapeBlockUpperBound,
      useLatest: false,
    }));
    rollupProcessor = new TestUpgradeRollupProcessor(rp.address, new EthersAdapter(ethers.provider));

    await proxyAdmin.upgradeUNSAFE(
      rollupProcessor.address,
      await ethers.getContractFactory('TestUpgradeRollupProcessor', signers[0]),
      [escapeBlockLowerBound, escapeBlockUpperBound],
    );

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

  it('try to deposit directly to implementation', async () => {
    const implementationAddress = await proxyAdmin.getProxyImplementation(rollupProcessor.address);
    const testProcessor = new TestRollupProcessor(
      EthAddress.fromString(implementationAddress),
      new EthersAdapter(ethers.provider),
    );

    const depositAmount = 50n;
    await expect(
      testProcessor.depositPendingFunds(0, depositAmount, undefined, {
        signingAddress: addresses[0],
      }),
    ).to.be.revertedWith('PAUSED()');
  });

  it('cannot initialize implementation directly', async () => {
    const implementationAddress = await proxyAdmin.getProxyImplementation(rollupProcessor.address);
    const implementation = await ethers.getContractAt('TestUpgradeRollupProcessor', implementationAddress);

    expect(await implementation.defiBridgeProxy()).to.be.eq(EthAddress.ZERO.toString());
    expect(await implementation.verifier()).to.be.eq(EthAddress.ZERO.toString());
    expect(await implementation.prevDefiInteractionsHash()).to.be.eq(formatBytes32String(''));
    expect(await implementation.rollupStateHash()).to.be.eq(formatBytes32String(''));
    expect(await implementation.escapeBlockLowerBound()).to.be.eq(BigNumber.from(escapeBlockLowerBound));
    expect(await implementation.escapeBlockUpperBound()).to.be.eq(BigNumber.from(escapeBlockUpperBound));
    expect(await implementation.allowThirdPartyContracts()).to.be.eq(false);

    await expect(
      implementation
        .connect(signers[0])
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
  });

  it('proxy admin owner has OWNER_ROLE of rollupProcessor', async () => {
    const proxyAdminOwner = await proxyAdmin.owner();
    expect(await rollupProcessor.hasRole(OWNER_ROLE, proxyAdminOwner)).to.be.eq(true);
  });

  it('anyone can initialize after unsafe deployment', async () => {
    const RollupProcessor = await ethers.getContractFactory('TestUpgradeRollupProcessor', signers[0]);

    const unsafeProxy = await proxyAdmin.deployProxyUNSAFE(RollupProcessor, [
      await rollupProcessor.escapeBlockLowerBound(),
      await rollupProcessor.escapeBlockUpperBound(),
    ]);

    const attacker = signers[1];
    expect(await unsafeProxy.hasRole(OWNER_ROLE, addresses[0].toString())).to.be.eq(false);
    expect(await unsafeProxy.hasRole(OWNER_ROLE, addresses[1].toString())).to.be.eq(false);

    expect(
      await unsafeProxy
        .connect(attacker)
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          addresses[1].toString(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    );

    expect(await unsafeProxy.hasRole(OWNER_ROLE, addresses[0].toString())).to.be.eq(false);
    expect(await unsafeProxy.hasRole(OWNER_ROLE, addresses[1].toString())).to.be.eq(true);
  });

  it('anyone can reinitialize after unsafe upgrade', async () => {
    const RollupProcessor = await ethers.getContractFactory('UpgradedTestRollupProcessorV2', signers[0]);

    const versionBefore = await rollupProcessor.getImplementationVersion();
    const unsafeUpgrade = await proxyAdmin.upgradeUNSAFE(rollupProcessor.address, RollupProcessor, [
      await rollupProcessor.escapeBlockLowerBound(),
      await rollupProcessor.escapeBlockUpperBound(),
    ]);

    const attacker = signers[1];
    expect(await unsafeUpgrade.hasRole(OWNER_ROLE, addresses[1].toString())).to.be.eq(false);
    expect(
      await unsafeUpgrade
        .connect(attacker)
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          await attacker.getAddress(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    );
    expect(await unsafeUpgrade.getImplementationVersion()).to.be.eq(versionBefore + 1);
    expect(await unsafeUpgrade.hasRole(OWNER_ROLE, addresses[1].toString())).to.be.eq(true);
  });

  it('cannot re-initialize proxy with same implementation version', async () => {
    await expect(
      rollupProcessor.rollupProcessor
        .connect(signers[0])
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
  });

  it('unsafe upgrade to lower version implementation cannot be initialized', async () => {
    const RollupProcessor = await ethers.getContractFactory('UpgradedTestRollupProcessorV0', signers[0]);

    const unsafeUpgrade = await proxyAdmin.upgradeUNSAFE(rollupProcessor.address, RollupProcessor, [
      await rollupProcessor.escapeBlockLowerBound(),
      await rollupProcessor.escapeBlockUpperBound(),
    ]);

    await expect(
      unsafeUpgrade
        .connect(signers[0])
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          await signers[0].getAddress(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(0);
  });

  it('cannot re-initialize after upgradeAndCall (with initialization)', async () => {
    const RollupProcessor = await ethers.getContractFactory('UpgradedTestRollupProcessorV2', signers[0]);
    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(1);
    expect(
      await proxyAdmin.upgradeAndInitializeWithConstructor(
        rollupProcessor.address,
        RollupProcessor,
        [
          (await rollupProcessor.verifier()).toString(),
          (await rollupProcessor.defiBridgeProxy()).toString(),
          await signers[0].getAddress(),
          '0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
          '0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
          '0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
          '0x0',
          false,
        ],
        [escapeBlockLowerBound, escapeBlockUpperBound],
      ),
    );

    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(2);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).to.be.eq(true);

    await expect(
      rollupProcessor.rollupProcessor
        .connect(signers[0])
        .initialize(
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          EthAddress.ZERO.toString(),
          OWNER_ROLE,
          OWNER_ROLE,
          OWNER_ROLE,
          0,
          false,
        ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
  });

  it('cannot upgrade to lower or equal version implementation', async () => {
    const RollupProcessor = await ethers.getContractFactory('RollupProcessor', signers[0]);
    const versionBefore = await rollupProcessor.getImplementationVersion();

    await expect(
      proxyAdmin.upgradeAndInitializeWithConstructor(
        rollupProcessor.address,
        RollupProcessor,
        [
          (await rollupProcessor.verifier()).toString(),
          (await rollupProcessor.defiBridgeProxy()).toString(),
          await signers[0].getAddress(),
          '0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
          '0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
          '0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
          '0x0',
          false,
        ],
        [escapeBlockLowerBound, escapeBlockUpperBound],
      ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(versionBefore);

    const RollupProcessorV0 = await ethers.getContractFactory('UpgradedTestRollupProcessorV0', signers[0]);
    await expect(
      proxyAdmin.upgradeAndInitializeWithConstructor(
        rollupProcessor.address,
        RollupProcessorV0,
        [
          (await rollupProcessor.verifier()).toString(),
          (await rollupProcessor.defiBridgeProxy()).toString(),
          await signers[0].getAddress(),
          '0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
          '0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
          '0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
          '0x0',
          false,
        ],
        [escapeBlockLowerBound, escapeBlockUpperBound],
      ),
    ).to.be.revertedWith(`Initializable: contract is already initialized`);
    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(versionBefore);
  });

  it('ownership of proxy admin is transferred, new owner can upgrade implementation', async () => {
    const newAdmin = signers[1];
    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(1);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[1])).to.be.eq(false);

    expect(await proxyAdmin.owner()).to.be.eql(addresses[0]);
    expect(await proxyAdmin.transferProxyAdminOwnership(addresses[1]));
    expect(await proxyAdmin.owner()).to.be.eql(addresses[1]);

    proxyAdmin.connectNewSigner(signers[1]);

    const RollupProcessor = await ethers.getContractFactory('UpgradedTestRollupProcessorV2', signers[1]);
    expect(
      await proxyAdmin.upgradeAndInitializeWithConstructor(
        rollupProcessor.address,
        RollupProcessor,
        [
          (await rollupProcessor.verifier()).toString(),
          (await rollupProcessor.defiBridgeProxy()).toString(),
          await newAdmin.getAddress(),
          '0x18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d',
          '0x298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa',
          '0x2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071',
          '0x0',
          false,
        ],
        [escapeBlockLowerBound, escapeBlockUpperBound],
      ),
    );

    expect(await rollupProcessor.getImplementationVersion()).to.be.eq(2);

    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[0])).to.be.eq(true);
    expect(await rollupProcessor.hasRole(OWNER_ROLE, addresses[1])).to.be.eq(true);
  });
});
