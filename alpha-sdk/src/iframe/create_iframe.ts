import { createDebugLogger } from '@aztec/barretenberg/log';
import EventEmitter from 'events';
import { IframeEvent } from './iframe_event.js';

const debug = createDebugLogger('iframe:iframe_aztec_wallet_provider');

export class Iframe extends EventEmitter {
  private origin: string;
  private frame!: HTMLIFrameElement;

  constructor(private src: string, private id: string) {
    super();
    this.origin = new URL(src).origin;
  }

  get window() {
    return this.frame.contentWindow!;
  }

  public async init() {
    this.destroy();
    debug('Iframe.init: creating');

    const frame = document.createElement('iframe');
    frame.id = this.id;
    frame.width = '0';
    frame.height = '0';
    frame.style.display = 'none';
    frame.style.border = 'none';
    frame.style.position = 'fixed';
    frame.style.top = '0';
    frame.style.left = '0';
    frame.style.zIndex = '-1';
    frame.src = this.src;

    this.destroyWhenOutdated();

    debug('Iframe.init: -> ready');
    await this.awaitFrameReady(frame);
    debug('Iframe.init: <- ready');

    this.frame = frame;
  }

  public destroy() {
    const elem = document.getElementById(this.id);
    if (elem) {
      debug('Iframe.destroy: ❌ removing');
      elem.remove();
    }
  }

  public open() {
    this.frame.style.display = 'block';
    this.frame.style.width = '100vw';
    this.frame.style.height = '100vh';
    this.frame.style.zIndex = '99999';
    this.emit(IframeEvent.OPEN);
  }

  public close() {
    this.frame.style.display = 'none';
    this.frame.style.width = '0';
    this.frame.style.height = '0';
    this.frame.style.zIndex = '-1';
    this.emit(IframeEvent.CLOSE);
  }

  private async awaitFrameReady(frame: HTMLIFrameElement) {
    let resolveFrameCreated: () => void;
    const frameReadyPromise = Promise.race([
      new Promise<void>(resolve => (resolveFrameCreated = resolve)),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`Aztec SDK load timeout: ${this.src}`)), 10000)),
    ]);

    const handleFrameReadyEvent = (e: MessageEvent) => {
      if (e.origin !== this.origin) {
        return;
      }

      if (e.data === IframeEvent.READY) {
        window.removeEventListener('message', handleFrameReadyEvent);
        resolveFrameCreated();
      }
    };

    window.addEventListener('message', handleFrameReadyEvent);

    document.body.appendChild(frame);

    await frameReadyPromise;
  }

  private destroyWhenOutdated() {
    const handleOutdated = (e: MessageEvent) => {
      if (e.origin !== this.origin) {
        return;
      }

      if (e.data === IframeEvent.NEW_VERSION_LOADED) {
        this.destroy();
        this.emit(IframeEvent.DESTROYED);
        window.removeEventListener('message', handleOutdated);
      }
    };

    window.addEventListener('message', handleOutdated);
  }
}

export async function createIframe(src: string, id = '') {
  const iframe = new Iframe(src, id);
  await iframe.init();
  return iframe;
}
