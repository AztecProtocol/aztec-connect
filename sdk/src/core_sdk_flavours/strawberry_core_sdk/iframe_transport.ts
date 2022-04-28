import EventEmitter from 'events';
import { MessageChannelTransportSocket, TransportConnect, TransportListener } from '../../transport';

export class IframeTransportListener extends EventEmitter implements TransportListener {
  constructor(private window: Window) {
    super();
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
    this.emit('new_socket', new MessageChannelTransportSocket(port));
  };
}

export class IframeTransportConnect implements TransportConnect {
  constructor(private window: Window, private targetOrigin: string) {}

  async createSocket() {
    const { port1, port2 } = new MessageChannel();
    this.window.postMessage(undefined, this.targetOrigin, [port2]);
    return new MessageChannelTransportSocket(port1);
  }
}
