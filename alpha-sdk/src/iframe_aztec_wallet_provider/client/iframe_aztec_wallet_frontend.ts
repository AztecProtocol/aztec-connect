import { createDebugLogger } from '@aztec/barretenberg/log';
import { createDispatchFn, DispatchMsg, TransportClient } from '@aztec/barretenberg/transport';
import { AztecWalletProviderClientStub } from '../../aztec_wallet_provider/aztec_wallet_provider_client_stub.js';
import { AztecWalletProvider } from '../../aztec_wallet_provider/index.js';
import { Iframe, IframeEvent } from '../../iframe/index.js';
import { IframeAztecWalletOptions } from '../server/iframe_aztec_wallet_backend.js';
const debug = createDebugLogger('aztec:sdk:iframe_aztec_wallet_frontend');

/**
 * IframeAztecWalletFrontend:
 *   Takes a transport client and iframe and passes iframe messages through the transport client
 *   The client is used by an AztecWalletProviderClientStub instance
 */
export class IframeAztecWalletFrontend {
  private aztecWalletProvider!: AztecWalletProvider;

  constructor(private transportClient: TransportClient<DispatchMsg>, private iframe: Iframe) {}

  public async initComponents(options: IframeAztecWalletOptions) {
    for (const e in IframeEvent) {
      const event = (IframeEvent as any)[e];
      switch (event) {
        case IframeEvent.OPEN:
        case IframeEvent.CLOSE:
          this.iframe.on(event, () =>
            this.transportClient.request({ fn: 'iframeDispatch', args: [{ fn: 'onchange', args: [event] }] }),
          );
          break;
      }
    }
    debug('initComponents ->', { fn: 'initComponents', args: [options] });

    // TODO error handling?
    // Call `initComponents` on the IframeBackend. Constructs and initializes the core sdk.
    await this.transportClient.request({ fn: 'initComponents', args: [options] });
    debug('initComponents <-', { fn: 'initComponents', args: [options] });

    this.aztecWalletProvider = new AztecWalletProviderClientStub({
      request: async (payload: DispatchMsg, transfer?: Transferable[]): Promise<any> => {
        debug('aztecWalletProvider.request ->', payload?.args[0]?.fn, payload);
        this.iframe.open();
        const result = await this.transportClient.request(payload, transfer);
        debug('aztecWalletProvider.request <-', payload?.args[0]?.fn, payload, result);
        this.iframe.close();
        return result;
      },
    });
    this.transportClient.on('event_msg', ({ fn, args }) => {
      debug('transportClient.event_msg: ', fn, args[0]?.fn);
      this[fn](...args);
    });

    return { aztecWalletProvider: this.aztecWalletProvider };
  }

  public walletProviderDispatch = createDispatchFn(() => this.aztecWalletProvider, debug);
  public iframeDispatch = createDispatchFn(() => this.iframe, debug);
}
