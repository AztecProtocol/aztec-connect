import createDebug from 'debug';
import type { Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { LazyInitCacheMap } from '../../app/util/lazy_init_cache_map.js';
import { Obs } from '../../app/util/index.js';
import { Poller } from '../../app/util/poller.js';

const debug = createDebug('chain_link_poller_cache');

const POLL_INTERVAL = 5 * 60 * 1000;

const ABI = ['function latestAnswer() public view returns(int256)'];

function createChainLinkOracleFetcher(priceFeedContractAddressStr: string, provider: Provider) {
  const contract = new Contract(priceFeedContractAddressStr, ABI, provider);
  return async () => {
    try {
      const bigNum = await contract.latestAnswer();
      return bigNum.toBigInt() as bigint;
    } catch (err) {
      debug(`Price fetch failed for address ${priceFeedContractAddressStr}`, err);
      throw err;
    }
  };
}

export function createChainLinkPollerCache(web3Provider: Provider) {
  return new LazyInitCacheMap((oracleContractAddress: string) => {
    const pollObs = Obs.constant(createChainLinkOracleFetcher(oracleContractAddress, web3Provider));
    return new Poller(pollObs, POLL_INTERVAL, undefined);
  });
}

export type ChainLinkPollerCache = ReturnType<typeof createChainLinkPollerCache>;
