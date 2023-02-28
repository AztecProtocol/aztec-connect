import { DispatchMsg, TransportServer } from '@aztec/barretenberg/transport';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { IframeEvent } from '../../iframe/iframe_event.js';
import { IframeTransportListener } from '../../iframe_transport_listener.js';
import { KeyStore } from '../../key_store/index.js';
import { IframeAztecWalletBackend } from './iframe_aztec_wallet_backend.js';

export class IframeAztecWalletProviderServer {
  constructor(private wasm: BarretenbergWasm, private keyStore: KeyStore) {}

  run() {
    const iframeAztecWalletBackend = new IframeAztecWalletBackend(this.wasm, this.keyStore);

    /**
     * Messages from our transport layer, are function calls to be dispatched to iframeAztecWalletBackend.
     * We can descend an arbitrary component stack by adding dispatch functions to classes, and nesting our messages.
     * An example message may look like:
     *   const msg = {
     *     fn: 'walletProviderDispatch',
     *     args: [{
     *       fn: 'signProofs',
     *       args: [...]
     *     }]
     *   }
     */
    const dispatchFn = ({ fn, args }: DispatchMsg) => {
      console.error('Iframe', fn, args);
      return iframeAztecWalletBackend[fn](...args);
    };
    const listener = new IframeTransportListener(window);
    const transportServer = new TransportServer(listener, dispatchFn);
    iframeAztecWalletBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));

    transportServer.start();
    window.parent.postMessage(IframeEvent.READY, '*');
  }
}

// parallels createIframeAztecWalletProviderClient
export function createIframeAztecWalletProviderServer(wasm: BarretenbergWasm, keyStore: KeyStore) {
  return new IframeAztecWalletProviderServer(wasm, keyStore);
}
