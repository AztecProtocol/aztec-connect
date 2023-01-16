import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { createDebugLogger, enableLogs, logHistory } from '@aztec/barretenberg/log';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdk, createCoreSdk } from '../core_sdk/index.js';
import { CreateCoreSdkOptions } from '../core_sdk/index.js';
import { AztecSdk } from './aztec_sdk.js';

const debug = createDebugLogger('bb:create_aztec_sdk');

async function createBlockchain(ethereumProvider: EthereumProvider, coreSdk: CoreSdk, confs = 3) {
  const { chainId, rollupContractAddress, permitHelperContractAddress } = await coreSdk.getLocalStatus();
  const {
    blockchainStatus: { assets, bridges },
  } = await coreSdk.getRemoteStatus();
  const blockchain = new ClientEthereumBlockchain(
    rollupContractAddress,
    permitHelperContractAddress,
    assets,
    bridges,
    ethereumProvider,
    confs,
  );
  const providerChainId = await blockchain.getChainId();
  if (chainId !== providerChainId) {
    throw new Error(`Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}.`);
  }
  return blockchain;
}

// TODO - remove it
export enum SdkFlavour {
  PLAIN,
  SHARED_WORKER,
  HOSTED,
}

type BlockchainOptions = { minConfirmation?: number };
export type CreateSdkOptions = BlockchainOptions & CreateCoreSdkOptions & { flavour?: SdkFlavour };

export async function createAztecSdk(ethereumProvider: EthereumProvider, options: CreateSdkOptions) {
  if (options.flavour) {
    console.warn('SdkFlavour has been deprecated.');
  }
  if (options.debug) {
    enableLogs(options.debug);
    logHistory.enable();
  }

  const coreSdk = await createCoreSdk(options);
  try {
    const blockchain = await createBlockchain(ethereumProvider, coreSdk, options.minConfirmation);
    return new AztecSdk(coreSdk, blockchain, ethereumProvider);
  } catch (err: any) {
    debug(`failed to create sdk: ${err.message}`);
    await coreSdk.destroy();
    throw err;
  }
}
