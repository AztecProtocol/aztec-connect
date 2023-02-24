import EventEmitter from 'events';
import { MessageChannelTransportSocket, TransportListener, TransportSocket } from './transport/index.js';

export class IframeTransportListener extends EventEmitter implements TransportListener {
  private handlers: Array<(client: TransportSocket) => void> = [];
  constructor(private window: Window) {
    super();
  }
  on(name: 'new_socket', cb: (client: TransportSocket) => void): this {
    this.handlers.push(cb);
    return this;
  }

  open() {
    this.window.addEventListener('message', this.handleMessageEvent);
  }

  close() {
    this.window.removeEventListener('message', this.handleMessageEvent);
  }

  private handleMessageEvent = (event: MessageEvent) => {
    const [port] = event.ports;
    if (!port) {
      return;
    }
    // Handler expected to be installed with 'on' before message events occur
    for (const handler of this.handlers) {
      handler(new MessageChannelTransportSocket(port));
    }
  };
}
