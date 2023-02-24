import { createDebugLogger } from '@aztec/barretenberg/log';
import { createDispatchFn, DispatchMsg, TransportClient } from '@aztec/barretenberg/transport';
import {
  AztecWalletProviderClientStub,
  TransportClientLike,
} from '../../aztec_wallet_provider/aztec_wallet_provider_client_stub.js';
import { Iframe, IframeEvent } from '../../iframe/index.js';

const debug = createDebugLogger('bb:eip1193_aztec_wallet_frontend');

/**
 * EIP1193AztecWalletFrontend:
 *   Handles messaging through the EIP1193 transport
 *   Optionally, an iframe and an iframeTransport can be passed for iframable wallets
 */
export class EIP1193AztecWalletFrontend {
  public aztecWalletProvider!: AztecWalletProviderClientStub;

  constructor(
    private eip1193Transport: TransportClientLike,
    private iframeTransport?: TransportClient<DispatchMsg>,
    private iframe?: Iframe,
  ) {}

  public initComponents() {
    if (this.iframe) {
      for (const e in IframeEvent) {
        const event = (IframeEvent as any)[e];
        switch (event) {
          case IframeEvent.OPEN:
          case IframeEvent.CLOSE:
            this.iframe.on(event, () =>
              this.iframeTransport!.request({ fn: 'iframeDispatch', args: [{ fn: 'onchange', args: [event] }] }),
            );
            break;
        }
      }
      this.iframeTransport!.on('event_msg', ({ fn, args }) => this[fn](...args));
    }

    this.aztecWalletProvider = new AztecWalletProviderClientStub(this.eip1193Transport);
  }

  public destroy() {
    if (this.iframe) {
      this.iframe.destroy();
      this.iframeTransport!.close();
    }
  }

  public iframeDispatch = createDispatchFn(() => this.iframe, debug);
}
