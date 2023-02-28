import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { createDebugLogger, enableLogs } from '@aztec/barretenberg/log';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdk, createCoreSdk, CreateCoreSdkOptions } from '../core_sdk/index.js';
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
    throw new Error(
      `Provider chainId ${providerChainId} does not match rollup provider chainId ${chainId}. Is your Ethereum provider (e.g. Metamask) pointing at the right network?`,
    );
  }
  return blockchain;
}

type BlockchainOptions = { minConfirmation?: number };
export type CreateSdkOptions = BlockchainOptions & CreateCoreSdkOptions;

export async function createAztecSdk(ethereumProvider: EthereumProvider, options: CreateSdkOptions) {
  if (options.debug) {
    enableLogs(options.debug);
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
