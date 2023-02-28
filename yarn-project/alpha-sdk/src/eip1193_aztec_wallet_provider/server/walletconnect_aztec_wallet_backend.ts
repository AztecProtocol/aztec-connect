import { createDebugLogger } from '@aztec/barretenberg/log';
import { RollupProvider } from '@aztec/barretenberg/rollup_provider';
import { createDispatchFn } from '@aztec/barretenberg/transport';
import EventEmitter from 'events';
import { AztecWalletProviderServerStub } from '../../aztec_wallet_provider/aztec_wallet_provider_server_stub.js';
import { IframeEvent } from '../../iframe/iframe_event.js';
import { IframeServerStub } from '../../iframe/iframe_server_stub.js';
import { BarretenbergWasm, KeyStore } from '../../index.js';

const debug = createDebugLogger('bb:walletconnect_aztec_wallet_backend');

export class WalletConnectAztecWalletBackend extends EventEmitter {
  public iframe = new IframeServerStub();
  private aztecWalletProviderStub?: AztecWalletProviderServerStub;

  constructor() {
    super();
    this.iframe.on(IframeEvent.OPEN, () => {
      this.emit('dispatch_msg', {
        fn: 'iframeDispatch',
        args: [{ fn: 'open', args: [] }],
      });
    });
    this.iframe.on(IframeEvent.CLOSE, () => {
      this.emit('dispatch_msg', {
        fn: 'iframeDispatch',
        args: [{ fn: 'close', args: [] }],
      });
    });
  }

  public async initWalletProvider(keyStore: KeyStore, rollupProvider: RollupProvider, wasm: BarretenbergWasm) {
    this.aztecWalletProviderStub = await AztecWalletProviderServerStub.new(keyStore, rollupProvider, wasm);
  }

  public isWalletProviderInitialized() {
    return !!this.aztecWalletProviderStub;
  }

  public walletProviderDispatch = createDispatchFn(() => this.aztecWalletProviderStub, debug);
  public iframeDispatch = createDispatchFn(() => this.iframe, debug);
}
