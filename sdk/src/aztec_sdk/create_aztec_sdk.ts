import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import createDebug from 'debug';
import isNode from 'detect-node';
import { SdkStatus } from '../core_sdk';
import {
  BananaCoreSdkOptions,
  createBananaCoreSdk,
  createStrawberryCoreSdk,
  createVanillaCoreSdk,
  StrawberryCoreSdkOptions,
  VanillaCoreSdkOptions,
} from '../core_sdk_flavours';
import { AztecSdk, AztecSdkOptions } from './aztec_sdk';

async function createBlockchain(ethereumProvider: EthereumProvider, sdkStatus: SdkStatus) {
  const { serverUrl, rollupContractAddress } = sdkStatus;
  const blockchain = ClientEthereumBlockchain.new(serverUrl, rollupContractAddress, ethereumProvider);
  await blockchain.init();
  return blockchain;
}

export type CreateAztecSdkOptions = AztecSdkOptions & BananaCoreSdkOptions;
export type CreateHostedAztecSdkOptions = AztecSdkOptions & StrawberryCoreSdkOptions;
export type CreateNodeAztecSdkOptions = AztecSdkOptions & VanillaCoreSdkOptions;

/**
 * Creates an AztecSdk that is backed by a CoreSdk that runs inside a service worker.
 */
export async function createAztecSdk(ethereumProvider: EthereumProvider, options: CreateAztecSdkOptions) {
  if (isNode) {
    throw new Error('Not browser.');
  }

  if (options.debug) {
    createDebug.enable('bb:*');
  }

  const coreSdk = await createBananaCoreSdk(options);
  const blockchain = await createBlockchain(ethereumProvider, await coreSdk.getLocalStatus());
  return new AztecSdk(coreSdk, blockchain, ethereumProvider, options);
}

/**
 * Creates an AztecSdk that is backed by a CoreSdk that is hosted on another domain, via an iframe.
 */
export async function createHostedAztecSdk(ethereumProvider: EthereumProvider, options: CreateHostedAztecSdkOptions) {
  if (isNode) {
    throw new Error('Not browser.');
  }

  if (options.debug) {
    createDebug.enable('bb:*');
  }

  const coreSdk = await createStrawberryCoreSdk(options);
  const blockchain = await createBlockchain(ethereumProvider, await coreSdk.getLocalStatus());
  return new AztecSdk(coreSdk, blockchain, ethereumProvider, options);
}

/**
 * Creates an AztecSdk that is backed directly by a CoreSdk (no iframe, no service worker).
 */
export async function createNodeAztecSdk(ethereumProvider: EthereumProvider, options: CreateNodeAztecSdkOptions) {
  if (!isNode) {
    throw new Error('Not node.');
  }

  if (options.debug) {
    createDebug.enable('bb:*');
  }

  const coreSdk = await createVanillaCoreSdk(options);
  const blockchain = await createBlockchain(ethereumProvider, await coreSdk.getLocalStatus());
  return new AztecSdk(coreSdk, blockchain, ethereumProvider, options);
}
