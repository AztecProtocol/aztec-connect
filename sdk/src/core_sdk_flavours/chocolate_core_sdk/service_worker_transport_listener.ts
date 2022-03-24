import EventEmitter from 'events';
import { MessageChannelTransportSocket, TransportListener } from '../../transport';

export class ServiceWorkerTransportListener extends EventEmitter implements TransportListener {
  constructor(private serviceWorker: ServiceWorkerGlobalScope) {
    super();
  }

  open() {
    this.serviceWorker.addEventListener('message', this.handleMessageEvent);
  }

  close() {
    this.serviceWorker.removeEventListener('message', this.handleMessageEvent);
  }

  private handleMessageEvent = (event: ExtendableMessageEvent) => {
    const [port] = event.ports;
    if (!port) {
      return;
    }
    this.emit('new_socket', new MessageChannelTransportSocket(port));
  };
}
