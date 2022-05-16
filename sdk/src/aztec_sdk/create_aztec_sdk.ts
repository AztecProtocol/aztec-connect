import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { enableLogs } from '@aztec/barretenberg/debug';
import isNode from 'detect-node';
import { CoreSdkInterface } from '../core_sdk';
import {
  BananaCoreSdkOptions,
  createBananaCoreSdk,
  createStrawberryCoreSdk,
  createVanillaCoreSdk,
  StrawberryCoreSdkOptions,
  VanillaCoreSdkOptions,
} from '../core_sdk_flavours';
import { AztecSdk } from './aztec_sdk';

async function createBlockchain(ethereumProvider: EthereumProvider, coreSdk: CoreSdkInterface, confs = 1) {
  const { chainId, rollupContractAddress } = await coreSdk.getLocalStatus();
  const {
    blockchainStatus: { assets, bridges },
  } = await coreSdk.getRemoteStatus();
  const blockchain = new ClientEthereumBlockchain(rollupContractAddress, assets, bridges, ethereumProvider, confs);
  const providerChainId = await blockchain.getChainId();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }
  return blockchain;
}

export enum SdkFlavour {
  PLAIN,
  SHARED_WORKER,
  HOSTED,
}

type BlockchainOptions = { minConfirmation?: number };
export type CreateSharedWorkerSdkOptions = BlockchainOptions & BananaCoreSdkOptions;
export type CreateHostedSdkOptions = BlockchainOptions & StrawberryCoreSdkOptions;
export type CreatePlainSdkOptions = BlockchainOptions & VanillaCoreSdkOptions;
export type CreateSdkOptions = CreateSharedWorkerSdkOptions &
  CreateHostedSdkOptions &
  CreatePlainSdkOptions & { flavour?: SdkFlavour };

/**
 * Creates an AztecSdk that is backed by a CoreSdk that runs inside a shared worker.
 */
export async function createSharedWorkerSdk(ethereumProvider: EthereumProvider, options: CreateSharedWorkerSdkOptions) {
  if (isNode) {
    throw new Error('Not browser.');
  }

  if (options.debug) {
    enableLogs(options.debug);
  }

  const coreSdk = await createBananaCoreSdk(options);
  try {
    const blockchain = await createBlockchain(ethereumProvider, coreSdk, options.minConfirmation);
    return new AztecSdk(coreSdk, blockchain, ethereumProvider);
  } catch (err) {
    await coreSdk.destroy();
    throw err;
  }
}

/**
 * Creates an AztecSdk that is backed by a CoreSdk that is hosted on another domain, via an iframe.
 */
export async function createHostedAztecSdk(ethereumProvider: EthereumProvider, options: CreateHostedSdkOptions) {
  if (isNode) {
    throw new Error('Not browser.');
  }

  if (options.debug) {
    enableLogs(options.debug);
  }

  const coreSdk = await createStrawberryCoreSdk(options);
  try {
    const blockchain = await createBlockchain(ethereumProvider, coreSdk, options.minConfirmation);
    return new AztecSdk(coreSdk, blockchain, ethereumProvider);
  } catch (err) {
    await coreSdk.destroy();
    throw err;
  }
}

/**
 * Creates an AztecSdk that is backed directly by a CoreSdk (no iframe, no shared worker).
 */
export async function createPlainAztecSdk(ethereumProvider: EthereumProvider, options: CreatePlainSdkOptions) {
  if (options.debug) {
    enableLogs(options.debug);
  }

  const coreSdk = await createVanillaCoreSdk(options);
  try {
    const blockchain = await createBlockchain(ethereumProvider, coreSdk, options.minConfirmation);
    return new AztecSdk(coreSdk, blockchain, ethereumProvider);
  } catch (err) {
    await coreSdk.destroy();
    throw err;
  }
}

export async function createAztecSdk(ethereumProvider: EthereumProvider, options: CreateSdkOptions) {
  switch (options.flavour) {
    case SdkFlavour.HOSTED:
      return createHostedAztecSdk(ethereumProvider, options);
    case SdkFlavour.SHARED_WORKER:
      return createSharedWorkerSdk(ethereumProvider, options);
    case SdkFlavour.PLAIN:
      return createPlainAztecSdk(ethereumProvider, options);
    default:
      if (isNode) {
        return createPlainAztecSdk(ethereumProvider, options);
      } else {
        return createHostedAztecSdk(ethereumProvider, options);
      }
  }
}
