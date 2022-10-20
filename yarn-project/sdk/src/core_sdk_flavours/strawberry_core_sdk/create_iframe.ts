import EventEmitter from 'events';

export enum IframeEvent {
  READY = 'READY',
  NEW_VERSION_LOADED = 'NEW_VERSION_LOADED',
  DESTROYED = 'DESTROYED',
}

class Iframe extends EventEmitter {
  private origin: string;
  private frame!: HTMLIFrameElement;

  constructor(private src: string, private id = 'aztec-sdk-iframe') {
    super();
    this.origin = new URL(src).origin;
  }

  get window() {
    return this.frame.contentWindow!;
  }

  public async init() {
    this.destroy();

    const frame = document.createElement('iframe');
    frame.id = this.id;
    frame.height = '0';
    frame.width = '0';
    frame.style.display = 'none';
    frame.style.border = 'none';
    frame.src = this.src;

    this.destroyWhenOutdated();

    await this.awaitFrameReady(frame);

    this.frame = frame;
  }

  public destroy() {
    document.getElementById(this.id)?.remove();
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

export async function createIframe(src: string) {
  const iframe = new Iframe(src);
  await iframe.init();
  return iframe;
}
