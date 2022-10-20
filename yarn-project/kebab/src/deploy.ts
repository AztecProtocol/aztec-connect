import { EthAddress } from '@aztec/barretenberg/address';
import { deployContracts } from '@aztec/blockchain';
import { RedeployConfig } from './configurator.js';
import { JsonRpcProvider } from '@aztec/blockchain';
import { sleep } from '@aztec/barretenberg/sleep';

const { REDEPLOY, ETHEREUM_HOST, FAUCET_OPERATOR, VK, PRIVATE_KEY, ROLLUP_PROVIDER_ADDRESS } = process.env;

async function waitForBlockchain(host: string) {
  const provider = new JsonRpcProvider(host);
  const getChainId = async () => {
    try {
      await provider.request({ method: 'eth_chainId', params: [] });
    } catch (e) {
      return false;
    }
    return true;
  };
  while (!(await getChainId())) {
    console.log('Waiting for blockchain...');
    await sleep(10000);
  }
}

// modifies the given config with the parameters after any new deployment
export async function deployToBlockchain(prevRedeploy?: number) {
  if (!REDEPLOY) {
    throw new Error('REDEPLOY arg must be specified');
  }
  if (!ETHEREUM_HOST) {
    throw new Error('ETHEREUM_HOST must be specified');
  }
  await waitForBlockchain(ETHEREUM_HOST);
  const redeployEnv = +REDEPLOY;
  console.log(`Redeploy env: ${redeployEnv}, saved config: ${prevRedeploy}`);
  if (prevRedeploy === undefined || prevRedeploy < redeployEnv) {
    //redeploy
    const addresses = await deployContracts(
      ETHEREUM_HOST,
      VK,
      PRIVATE_KEY,
      FAUCET_OPERATOR ? EthAddress.fromString(FAUCET_OPERATOR) : undefined,
      ROLLUP_PROVIDER_ADDRESS ? EthAddress.fromString(ROLLUP_PROVIDER_ADDRESS) : undefined,
    );

    const redeployConfig: RedeployConfig = {};
    redeployConfig.redeploy = redeployEnv;
    console.log(`FAUCET_CONTRACT_ADDRESS: ${addresses.FAUCET_CONTRACT_ADDRESS}`);
    console.log(`ROLLUP_CONTRACT_ADDRESS: ${addresses.ROLLUP_CONTRACT_ADDRESS}`);
    console.log(`PERMIT_HELPER_CONTRACT_ADDRESS: ${addresses.PERMIT_HELPER_CONTRACT_ADDRESS}`);
    console.log(`FEE_DISTRIBUTOR_ADDRESS: ${addresses.FEE_DISTRIBUTOR_ADDRESS}`);
    console.log(`PRICE_FEED_CONTRACT_ADDRESSES: ${addresses.PRICE_FEED_CONTRACT_ADDRESSES}`);
    redeployConfig.faucetContractAddress = EthAddress.fromString(addresses.FAUCET_CONTRACT_ADDRESS!);
    redeployConfig.rollupContractAddress = EthAddress.fromString(addresses.ROLLUP_CONTRACT_ADDRESS!);
    redeployConfig.feeDistributorAddress = EthAddress.fromString(addresses.FEE_DISTRIBUTOR_ADDRESS!);
    redeployConfig.permitHelperContractAddress = EthAddress.fromString(addresses.PERMIT_HELPER_CONTRACT_ADDRESS!);
    redeployConfig.priceFeedContractAddresses = addresses
      .PRICE_FEED_CONTRACT_ADDRESSES!.split(',')
      .map(EthAddress.fromString);
    return redeployConfig;
  }
}
