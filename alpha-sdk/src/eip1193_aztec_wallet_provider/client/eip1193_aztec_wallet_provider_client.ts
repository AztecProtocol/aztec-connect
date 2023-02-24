import { DispatchMsg, TransportClient } from '@aztec/barretenberg/transport';
import { AztecWalletProvider } from '../../aztec_wallet_provider/aztec_wallet_provider.js';
import { createIframe } from '../../iframe/create_iframe.js';
import { IframeTransportConnect } from '../../iframe/iframe_transport_connect.js';
import { CoreTypes } from '@walletconnect/types';
import { EIP1193AztecWalletFrontend } from './eip1193_aztec_wallet_frontend.js';
import { EIP1193SignClient } from './eip1193_sign_client.js';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';

function transportFromEIP1193Provider(eip1193Provider: EthereumProvider) {
  return {
    request(payload: DispatchMsg) {
      const { fn, args } = payload.args[0];
      const rpcMethod = `aztec_${fn}`;
      return eip1193Provider.request({
        method: rpcMethod,
        params: args,
      });
    },
  };
}

export class EIP1193AztecWalletProviderClient {
  private eip1193AWPFrontend: EIP1193AztecWalletFrontend | null = null;

  constructor(private eip1193Provider: EthereumProvider) {}

  public async init(): Promise<AztecWalletProvider> {
    if (this.eip1193AWPFrontend) {
      throw new Error('Already initialized');
    }

    let iframe;
    let iframeTransport;

    if (this.eip1193Provider instanceof EIP1193SignClient) {
      const walletConnectSession = this.eip1193Provider.session;
      const peerMetadata = walletConnectSession.peer.metadata as CoreTypes.Metadata & { iframable: boolean };
      const account = walletConnectSession.namespaces.aztec.accounts[0];
      const [, , aztecAccount] = account.split(':');

      if (peerMetadata.iframable) {
        iframe = await createIframe(
          `${peerMetadata.url}/iframe?topic=${walletConnectSession.topic}&aztecAccount=${aztecAccount}`,
          'aztec-sdk-iframe',
        );

        const connector = new IframeTransportConnect(iframe.window, peerMetadata.url);
        iframeTransport = new TransportClient<DispatchMsg>(connector);
        await iframeTransport.open();
      }
    }

    this.eip1193AWPFrontend = new EIP1193AztecWalletFrontend(
      transportFromEIP1193Provider(this.eip1193Provider),
      iframeTransport,
      iframe,
    );

    this.eip1193AWPFrontend.initComponents();
    return this.eip1193AWPFrontend.aztecWalletProvider;
  }

  public destroy() {
    if (this.eip1193AWPFrontend) {
      this.eip1193AWPFrontend.destroy();
      this.eip1193AWPFrontend = null;
    }
  }
}
