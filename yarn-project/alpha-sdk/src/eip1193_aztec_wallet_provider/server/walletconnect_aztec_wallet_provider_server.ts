import { createDebugLogger } from '@aztec/barretenberg/log';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { DispatchMsg, TransportServer } from '@aztec/barretenberg/transport';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { SignClient } from '@walletconnect/sign-client/dist/types/client.js';
import { SignClientTypes } from '@walletconnect/types';
import { IframeEvent } from '../../iframe/iframe_event.js';
import { IframeTransportListener } from '../../iframe_transport_listener.js';
import { KeyStore } from '../../key_store/index.js';
import { RPCWrapper } from '../rpc_wrapper.js';
import { WalletConnectAztecWalletBackend } from './walletconnect_aztec_wallet_backend.js';

const debug = createDebugLogger('bb:walletconnect_aztec_wallet_provider_client');

type WalletConnectRequestEvent = SignClientTypes.BaseEventArgs<{
  request: {
    method: string;
    params: any;
  };
  chainId: string;
}>;

export class WalletConnectAztecWalletProviderServer {
  private iframeAztecWalletBackend: WalletConnectAztecWalletBackend;
  private rpcWrapper?: RPCWrapper;
  private cachedRequests: WalletConnectRequestEvent[] = [];

  constructor() {
    // Bind listener methods
    this.dispatchFn = this.dispatchFn.bind(this);
    this.onWalletConnectRequest = this.onWalletConnectRequest.bind(this);

    const listener = new IframeTransportListener(window);
    const transportServer = new TransportServer(listener, this.dispatchFn);
    this.iframeAztecWalletBackend = new WalletConnectAztecWalletBackend();
    this.iframeAztecWalletBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));
    transportServer.start();
    window.parent.postMessage(IframeEvent.READY, '*');
  }

  public openIframe() {
    return this.iframeAztecWalletBackend.iframe.open();
  }

  public closeIframe() {
    return this.iframeAztecWalletBackend.iframe.close();
  }

  public setClient(signClient: SignClient) {
    if (this.rpcWrapper) {
      throw new Error('Stop the current client first');
    }
    this.rpcWrapper = new RPCWrapper(signClient);
    this.rpcWrapper.on('session_request', this.onWalletConnectRequest);
  }

  public async initWalletProvider(keyStore: KeyStore, rollupProvider: RollupProvider, wasm: BarretenbergWasm) {
    if (!this.rpcWrapper) {
      throw new Error('Set the wc client first');
    }
    await this.iframeAztecWalletBackend.initWalletProvider(keyStore, rollupProvider, wasm);
    while (this.cachedRequests.length) {
      const request = this.cachedRequests.shift();
      await this.onWalletConnectRequest(request!);
    }
  }

  public stop() {
    if (this.rpcWrapper) {
      this.rpcWrapper.off('session_request', this.onWalletConnectRequest);
      this.rpcWrapper.destroy();
      this.rpcWrapper = undefined;
    }
  }

  private dispatchFn({ fn, args }: DispatchMsg) {
    return this.iframeAztecWalletBackend[fn](...args);
  }

  private async onWalletConnectRequest(event: WalletConnectRequestEvent) {
    if (!this.iframeAztecWalletBackend.isWalletProviderInitialized()) {
      debug('Caching walletconnect request', event.params.request.method);
      this.cachedRequests.push(event);
      return;
    }
    const fn = event.params.request.method.split('_')[1];
    const args = event.params.request.params;
    debug('got walletconnect request', fn, args);

    let result, error;
    try {
      result = await this.iframeAztecWalletBackend.walletProviderDispatch({ fn, args });
    } catch (err) {
      error = err;
    }

    debug('sending walletconnect result', fn, args, { result, error });
    debug('walletconnect result for', fn, 'has length', JSON.stringify({ result, error }).length, { result, error });

    await this.rpcWrapper!.respond(event.topic, event.params.chainId, event.params.request.method, {
      id: event.id,
      payload: {
        result,
        error,
      },
    });
  }
}
