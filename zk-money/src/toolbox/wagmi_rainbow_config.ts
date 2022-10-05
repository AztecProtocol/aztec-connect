import '@rainbow-me/rainbowkit/dist/index.css';
import { wallet, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createClient, Chain, chain } from 'wagmi';
import { infuraProvider } from 'wagmi/providers/infura';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { publicProvider } from 'wagmi/providers/public';
import type { Config } from 'config';

function getChain(chainId: number): Chain {
  switch (chainId) {
    case 1:
      return chain.mainnet;
    case 1337:
      return chain.localhost;
    case 0xa57ec:
      return {
        id: 0xa57ec,
        name: 'Aztec Ethereum Mainnet Fork',
        network: 'mainnet-fork',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: 'https://aztec-connect-testnet-eth-host.aztec.network' },
      };
    case 0xdef:
      return {
        id: 0xdef,
        name: 'Aztec Ethereum Mainnet Fork Devnet',
        network: 'mainnet-fork',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: { default: 'https://aztec-connect-dev-eth-host.aztec.network' },
      };
    default:
      throw new Error(`Unknown chainId: ${chainId}`);
  }
}

function getPublicProvider(config: Config) {
  switch (config.chainId) {
    case 1: {
      // TODO: reshape config to remove this flakey parsing
      const match = config.ethereumHost.match(/[0-9a-z]{32}/);
      const infuraId = match?.[0];
      if (!infuraId) throw new Error('Could not parse infuraId');
      return infuraProvider({ infuraId });
    }
    case 1337:
    case 0xa57ec:
    case 0xdef:
      return jsonRpcProvider({ rpc: () => ({ http: config.ethereumHost }) });
    default:
      throw new Error('Could not determine publicProvider');
  }
}

export function getWagmiRainbowConfig(config: Config) {
  const { chains, provider, webSocketProvider } = configureChains(
    [getChain(config.chainId)],
    [getPublicProvider(config), publicProvider()],
  );
  const wallets = [wallet.metaMask({ chains }), wallet.walletConnect({ chains })];
  const connectors = connectorsForWallets([{ groupName: 'Supported', wallets }]);
  const wagmiClient = createClient({
    autoConnect: true,
    connectors,
    provider,
    webSocketProvider,
  });
  return { wagmiClient, chains };
}
