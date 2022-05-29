import { EthAddress } from '@aztec/barretenberg/address';
import { Contract, ContractFactory, Signer } from 'ethers';
import * as ProxyAdminContract from '../../artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json';
import * as ProxyContract from '../../artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json';

/**
 * Thin wrapper around the Proxy Admin contract.
 */
export class ProxyAdmin {
  proxyAdmin: Contract;

  constructor(private signer: Signer) {
    this.proxyAdmin = new Contract(EthAddress.ZERO.toString(), ProxyAdminContract.abi, this.signer);
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
    const proxyFactory = new ContractFactory(ProxyContract.abi, ProxyContract.bytecode, this.signer);
    const calldata = implementation.interface.encodeFunctionData('initialize', initializeArgs);
    const proxy = await (
      await proxyFactory.deploy(implementation.address, this.proxyAdmin.address, calldata)
    ).deployed();

    return implementation.attach(proxy.address);
  }
}
