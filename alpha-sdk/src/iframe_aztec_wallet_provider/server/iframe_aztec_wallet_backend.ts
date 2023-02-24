import { createDebugLogger, enableLogs } from '@aztec/barretenberg/log';
import { DispatchMsg, createDispatchFn } from '@aztec/barretenberg/transport';
import EventEmitter from 'events';
import { AztecWalletProviderServerStub } from '../../aztec_wallet_provider/aztec_wallet_provider_server_stub.js';
import { IframeEvent } from '../../iframe/iframe_event.js';
import { IframeServerStub } from '../../iframe/iframe_server_stub.js';
import { BarretenbergWasm, KeyStore, ServerRollupProvider } from '../../index.js';
const debug = createDebugLogger('aztec:sdk:iframe_aztec_wallet_backend');

export interface IframeAztecWalletBackend extends EventEmitter {
  on(name: 'dispatch_msg', handler: (msg: DispatchMsg) => void): this;
  emit(name: 'dispatch_msg', payload: DispatchMsg): boolean;
}

export interface IframeAztecWalletOptions {
  debug?: string;
  host: string;
  pollInterval: number;
  version: string;
}

export class IframeAztecWalletBackend extends EventEmitter {
  // The server stub class is like AztecWalletProvider but takes and emits JSON-friendly types
  // to send over iframe messaging
  private aztecWalletProviderStub!: AztecWalletProviderServerStub;
  private iframe = new IframeServerStub();
  private initPromise!: Promise<void>;

  constructor(private wasm: BarretenbergWasm, public keyStore: KeyStore) {
    super();
  }

  public async initComponents(options: IframeAztecWalletOptions) {
    if (!this.initPromise) {
      this.initPromise = this.initInternal(options);
    }
    await this.initPromise;
  }

  private async initInternal(options: IframeAztecWalletOptions) {
    if (options.debug) {
      enableLogs(options.debug);
    }

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
    const rollupProvider = new ServerRollupProvider(new URL(options.host), options.pollInterval, options.version);

    this.aztecWalletProviderStub = await AztecWalletProviderServerStub.new(this.keyStore, rollupProvider, this.wasm);
  }

  public walletProviderDispatch = createDispatchFn(() => this.aztecWalletProviderStub, debug);
  public iframeDispatch = createDispatchFn(() => this.iframe, debug);
}
