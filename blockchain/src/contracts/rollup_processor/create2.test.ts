import { EthAddress } from '@aztec/barretenberg/address';
import { Contract, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { evmRevert, evmSnapshot } from '../../ganache/hardhat_chain_manipulation';
import { ProxyAdmin } from './proxy_admin';
import { EthersAdapter } from '../../provider';
import { setupAssets } from '../asset/fixtures/setup_assets';
import { RollupProcessor } from './rollup_processor';

describe('rollup_processor: upgradable test', () => {
  let rollup: RollupProcessor;
  let proxyAdmin: ProxyAdmin;
  let implementation: Contract;
  let signers: Signer[];
  let addresses: EthAddress[];
  let calldata: string;

  let snapshot: string;

  const escapeBlockLowerBound = 80;
  const escapeBlockUpperBound = 100;

  let initializeArgs: unknown[];

  beforeAll(async () => {
    signers = await ethers.getSigners();
    addresses = await Promise.all(signers.map(async u => EthAddress.fromString(await u.getAddress())));

    const rollupFactory = await ethers.getContractFactory('RollupProcessor', signers[0]);
    implementation = await (await rollupFactory.deploy(escapeBlockLowerBound, escapeBlockUpperBound)).deployed();

    proxyAdmin = new ProxyAdmin(signers[0]);

    await proxyAdmin.deployInstance();

    initializeArgs = [
      EthAddress.ZERO.toString(),
      EthAddress.ZERO.toString(),
      addresses[0].toString(),
      Buffer.from('18ceb5cd201e1cee669a5c3ad96d3c4e933a365b37046fc3178264bede32c68d', 'hex'),
      Buffer.from('298329c7d0936453f354e4a5eef4897296cc0bf5a66f2a528318508d2088dafa', 'hex'),
      Buffer.from('2fd2364bfe47ccb410eba3a958be9f39a8c6aca07db1abd15f5a211f51505071', 'hex'),
      0,
      false,
    ];

    calldata = implementation.interface.encodeFunctionData('initialize', initializeArgs);

    const proxy = await proxyAdmin.deployProxyAndInitializeWithConstructor(
      await ethers.getContractFactory('RollupProcessor', signers[0]),
      initializeArgs,
      [escapeBlockLowerBound, escapeBlockUpperBound],
    );

    rollup = new RollupProcessor(EthAddress.fromString(proxy.address), new EthersAdapter(ethers.provider));
  });

  beforeEach(async () => {
    snapshot = await evmSnapshot();
  });

  afterEach(async () => {
    await evmRevert(snapshot);
  });

  it('cannot redeploy with same salt when contract is intact', async () => {
    const implementationAddress = await proxyAdmin.getProxyImplementation(rollup.address);

    await expect(
      proxyAdmin.proxyDeployer.deployProxy(
        implementationAddress,
        proxyAdmin.address.toString(),
        calldata,
        proxyAdmin.vanitySalt,
      ),
    ).rejects.toThrow();
  });

  it('self destruct and redeploy', async () => {
    const implementationAddress = await proxyAdmin.getProxyImplementation(rollup.address);
    const stateHash = await rollup.stateHash();

    // Upgrade and kill
    await proxyAdmin.upgradeAndInitializeWithConstructor(
      rollup.address,
      await ethers.getContractFactory('ProxyKiller', signers[0]),
      [],
      [],
    );

    // No contract at `rollup`, tx will fail
    await expect(rollup.stateHash()).rejects.toThrow();

    // Redeploy to the same address
    await (
      await proxyAdmin.proxyDeployer
        .connect(signers[1])
        .deployProxy(implementationAddress, proxyAdmin.address.toString(), calldata, proxyAdmin.vanitySalt)
    ).wait();

    expect(await rollup.stateHash()).toStrictEqual(stateHash);
  });

  it('user deposits, self destruct, non-eth funds still at address', async () => {
    const assets = await setupAssets(signers[0], signers, 10n ** 18n, 1);

    // Add asset and deposit into rollup
    expect(await rollup.setSupportedAsset(assets[1].getStaticInfo().address, assets[1].getStaticInfo().gasLimit));

    const depositAmount = 10n * 10n ** 10n;

    expect(await assets[1].mint(depositAmount, addresses[1]));
    expect(await assets[1].approve(depositAmount, addresses[1], rollup.address));

    expect(await rollup.depositPendingFunds(1, depositAmount, Buffer.alloc(32), { signingAddress: addresses[1] }));
    expect(await assets[1].balanceOf(rollup.address)).toBe(depositAmount);

    // Upgrade and kill
    await proxyAdmin.upgradeAndInitializeWithConstructor(
      rollup.address,
      await ethers.getContractFactory('ProxyKiller', signers[0]),
      [],
      [],
    );

    // Ensure that rollup is dead but still have the funds
    await expect(rollup.stateHash()).rejects.toThrow();
    expect(await assets[1].balanceOf(rollup.address)).toBe(depositAmount);
  });
});
