import { EventEmitter } from 'events';
import { IframeEvent } from './iframe_event.js';

export class IframeServerStub extends EventEmitter {
  private openPromise?: Promise<void>;
  private confirmOpen?: (...v: any) => void;
  private closePromise?: Promise<void>;
  private confirmClose?: (...v: any) => void;

  // Called from IframeFrontend when the actual iframe has opened or closed.
  public onchange(event: IframeEvent) {
    switch (event) {
      case IframeEvent.OPEN:
        if (this.confirmOpen) {
          this.confirmOpen();
          this.confirmOpen = undefined;
          this.openPromise = undefined;
        }
        break;
      case IframeEvent.CLOSE:
        if (this.confirmClose) {
          this.confirmClose();
          this.confirmClose = undefined;
          this.closePromise = undefined;
        }
        break;
    }
  }

  public open() {
    if (!this.openPromise) {
      this.openPromise = new Promise(resolve => {
        this.confirmOpen = resolve;
        this.emit(IframeEvent.OPEN);
      });
    }
    return this.openPromise;
  }

  public close() {
    if (!this.closePromise) {
      this.closePromise = new Promise(resolve => {
        this.confirmClose = resolve;
        this.emit(IframeEvent.CLOSE);
      });
    }
    return this.closePromise;
  }
}
