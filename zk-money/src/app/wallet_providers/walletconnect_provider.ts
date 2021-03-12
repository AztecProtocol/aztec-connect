import { EthereumProvider } from '@aztec/sdk';
import { EthereumProviderNotifications, RequestArguments } from '@aztec/sdk/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import WalletConnectProvider from '@walletconnect/web3-provider';
import { utils } from 'ethers';
import { WalletProvider } from './wallet_provider';

export class WalletConnectEthereumProvider implements EthereumProvider {
  private readonly pollingInterval = 15 * 1000;
  private readonly pollingTimeout = 3600 * 1000;

  constructor(private ethereumProvider: EthereumProvider) {}

  on(notification: EthereumProviderNotifications, listener: (...args: any) => void) {
    this.ethereumProvider.on(notification as any, listener);
    return this;
  }

  removeListener(notification: EthereumProviderNotifications, listener: (...args: any) => void) {
    this.ethereumProvider.removeListener(notification as any, listener);
    return this;
  }

  async request(args: RequestArguments) {
    switch (args.method) {
      case 'eth_sign':
        return this.signMessage(args);
      case 'eth_sendTransaction':
        return this.handleSendTransaction(args);
      default:
        return this.ethereumProvider.request(args);
    }
  }

  private async signMessage(args: RequestArguments) {
    const [address, messageStr] = args.params!;
    const message = Buffer.from(messageStr.replace(/^0x/i, ''), 'hex');
    const toSign = [
      ...utils.toUtf8Bytes(`\x19Ethereum Signed Message:\n${message.length}`),
      ...new Uint8Array(message),
    ];
    return (this.ethereumProvider as any).connector.signMessage([address.toLowerCase(), utils.keccak256(toSign)]);
  }

  private async handleSendTransaction(args: RequestArguments) {
    const data = (args.params && args.params[0].data) || '';
    switch (data.slice(2, 10)) {
      case 'd1d2d95e':
        return this.depositFundsToContract(args);
      case 'e3936355':
        return this.approveProof(args);
      default:
        return this.ethereumProvider.request(args);
    }
  }

  private async depositFundsToContract(args: RequestArguments) {
    const { data, to } = args.params![0];
    const [assetId, amount, account] = data.slice(10).match(/([0-9a-f]{64})/gi);
    const requiredChanges = BigInt(`0x${amount}`);
    let initialBalance = await this.getUserPendingDeposit(assetId, account, to);
    return this.sendTransactionAndPoll(args, async () => {
      const balance = await this.getUserPendingDeposit(assetId, account, to);
      const confirmed = balance - initialBalance === requiredChanges;
      initialBalance = balance;
      return confirmed;
    });
  }

  private async getUserPendingDeposit(assetId: string, account: string, to: string) {
    const pendingDeposit = await this.ethereumProvider.request({
      method: 'eth_call',
      params: [
        {
          data: `0xa3d205f4${assetId}${account}`,
          to,
        },
        'latest',
      ],
    });
    return BigInt(pendingDeposit);
  }

  private async approveProof(args: RequestArguments) {
    const { data, from, to } = args.params![0];
    const account = from.replace(/^0x/i, '').padStart(64, '0');
    const proofHash = data.slice(10);
    return this.sendTransactionAndPoll(args, async () => this.getUserProofApprovalStatus(account, proofHash, to));
  }

  private async getUserProofApprovalStatus(account: string, proofHash: string, to: string) {
    const approved = await this.ethereumProvider.request({
      method: 'eth_call',
      params: [
        {
          data: `0x781e0432${account}${proofHash}`,
          to,
        },
        'latest',
      ],
    });
    return !approved.match(/^0x0{64}$/i);
  }

  private async sendTransactionAndPoll(args: RequestArguments, poll: () => Promise<boolean>) {
    let pollRequest = -1;
    let pollStartAt: number;

    const confirmFromData = new Promise<string>(resolve => {
      pollStartAt = Date.now();
      pollRequest = window.setInterval(async () => {
        const confirmed = await poll();
        if (confirmed) {
          resolve('');
        } else if (Date.now() - pollStartAt >= this.pollingTimeout) {
          throw new Error('Timeout awaiting tx settlement.');
        }
      }, this.pollingInterval);
    });

    try {
      const tx = await Promise.race([this.ethereumProvider.request(args), confirmFromData]);
      const provider = new Web3Provider(this.ethereumProvider);
      if (tx && (await provider.getTransactionReceipt(tx))) {
        return tx;
      }
      return this.getLatestTxHash(provider);
    } finally {
      clearInterval(pollRequest);
    }
  }

  private async getLatestTxHash(provider: Web3Provider, blockNumber = 0): Promise<string> {
    if (blockNumber < 0) {
      throw new Error('Cannot find a nonempty block.');
    }
    const block = await provider.getBlock(blockNumber || 'latest');
    return block.transactions[0] || (await this.getLatestTxHash(provider, block.number - 1));
  }
}

class WalletconnectProvider implements WalletProvider {
  public ethereumProvider: EthereumProvider;

  constructor(private provider: WalletConnectProvider) {
    this.ethereumProvider = new WalletConnectEthereumProvider(provider as any);
  }

  async connect() {
    const handleRejection = new Promise((_, reject) => {
      this.provider.wc.on('disconnect', () => {
        reject('Connection rejected.');
      });
    });
    await Promise.race([this.provider.enable(), handleRejection]);
  }

  async disconnect() {
    // Calling `disconnect` or `close` will option modal again.
    // https://github.com/WalletConnect/walletconnect-monorepo/issues/436
    // await this.provider.disconnect();
    localStorage.removeItem('walletconnect');
  }
}

export const createWalletconnectProvider = (infuraId: string) => {
  const provider = new WalletConnectProvider({
    infuraId,
  });
  return new WalletconnectProvider(provider);
};
