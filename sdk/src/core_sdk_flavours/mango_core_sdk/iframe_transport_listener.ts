import EventEmitter from 'events';
import { MessageChannelTransportSocket, TransportListener } from '../../transport';

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
