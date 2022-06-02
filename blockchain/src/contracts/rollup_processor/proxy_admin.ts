import { EthAddress } from '@aztec/barretenberg/address';
import { Contract, ContractFactory, Signer } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import * as ProxyAdminContract from '../../artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';
import * as ProxyContract from '../../artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';
import * as ProxyDeployer from '../../artifacts/contracts/periphery/ProxyDeployer.sol/ProxyDeployer.json';

/**
 * Thin wrapper around the Proxy Admin contract.
 */
export class ProxyAdmin {
  proxyAdmin: Contract;
  proxyDeployer: Contract;

  vanitySalt: string = formatBytes32String('Aztec Connect');

  constructor(private signer: Signer) {
    this.proxyAdmin = new Contract(EthAddress.ZERO.toString(), ProxyAdminContract.abi, this.signer);
    this.proxyDeployer = new Contract(EthAddress.ZERO.toString(), ProxyDeployer.abi, this.signer);
  }

  connectNewSigner(signer: Signer) {
    this.signer = signer;
    this.connectToInstance(this.address);
  }

  connectToInstance(address: EthAddress) {
    this.proxyAdmin = new Contract(address.toString(), ProxyAdminContract.abi, this.signer);
  }

  async deployInstance() {
    const factory = new ContractFactory(ProxyAdminContract.abi, ProxyAdminContract.bytecode, this.signer);
    this.proxyAdmin = await (await factory.deploy()).deployed();
    const deployerFactory = new ContractFactory(ProxyDeployer.abi, ProxyDeployer.bytecode, this.signer);
    this.proxyDeployer = await (await deployerFactory.deploy()).deployed();
  }

  get address() {
    return EthAddress.fromString(this.proxyAdmin.address);
  }

  get contract() {
    return this.proxyAdmin;
  }

  async owner() {
    return EthAddress.fromString(await this.proxyAdmin.owner());
  }

  async getProxyAdmin(proxy: EthAddress) {
    return await this.proxyAdmin.getProxyAdmin(proxy.toString());
  }

  async getProxyImplementation(proxy: EthAddress) {
    return await this.proxyAdmin.getProxyImplementation(proxy.toString());
  }

  async changeProxyAdmin(proxy: EthAddress, newAdmin: EthAddress) {
    await this.proxyAdmin.changeProxyAdmin(proxy.toString(), newAdmin.toString());
  }

  async transferProxyAdminOwnership(newOwner: EthAddress) {
    await this.proxyAdmin.transferOwnership(newOwner.toString());
  }

  async upgradeUNSAFE(proxy: EthAddress, implementationFactory: ContractFactory, constructorArgs: unknown[]) {
    const implementation = await (await implementationFactory.deploy(...constructorArgs)).deployed();
    await this.proxyAdmin.upgrade(proxy.toString(), implementation.address);
    return implementation.attach(proxy.toString());
  }

  async upgradeAndInitializeWithConstructor(
    proxy: EthAddress,
    implementationFactory: ContractFactory,
    initializeArgs: unknown[],
    constructorArgs: unknown[],
  ) {
    const implementation = await (await implementationFactory.deploy(...constructorArgs)).deployed();
    const calldata = implementation.interface.encodeFunctionData('initialize', initializeArgs);
    await this.proxyAdmin.upgradeAndCall(proxy.toString(), implementation.address, calldata);

    return implementation.attach(proxy.toString());
  }

  async deployProxyUNSAFE(implementationFactory: ContractFactory, constructorArgs: unknown[]): Promise<Contract> {
    const implementation = await (await implementationFactory.deploy(...constructorArgs)).deployed();
    const proxyFactory = new ContractFactory(ProxyContract.abi, ProxyContract.bytecode, this.signer);
    const calldata = '0x';

    const proxy = await (
      await proxyFactory.deploy(implementation.address, this.proxyAdmin.address, calldata)
    ).deployed();

    return implementation.attach(proxy.address);
  }

  async deployProxyAndInitializeWithConstructor(
    implementationFactory: ContractFactory,
    initializeArgs: unknown[],
    constructorArgs: unknown[],
  ): Promise<Contract> {
    const implementation = await (await implementationFactory.deploy(...constructorArgs)).deployed();
    const calldata = implementation.interface.encodeFunctionData('initialize', initializeArgs);

    const tx = await (
      await this.proxyDeployer.deployProxy(implementation.address, this.proxyAdmin.address, calldata, this.vanitySalt)
    ).wait();

    const events = tx.events;
    const proxyDeployedEvent = events[events.length - 1];
    const proxyAddress = proxyDeployedEvent.args['proxy'];

    const proxy = new Contract(proxyAddress, ProxyContract.abi, this.signer);

    return implementation.attach(proxy.address);
  }
}
