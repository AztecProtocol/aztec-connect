import EventEmitter from 'events';
import { MessageChannelTransportSocket, TransportListener } from '../../transport';

export class SharedWorkerTransportListener extends EventEmitter implements TransportListener {
  constructor(private sharedWorker: SharedWorkerGlobalScope) {
    super();
  }

  open() {
    this.sharedWorker.onconnect = this.handleMessageEvent;
  }

  close() {
    this.sharedWorker.onconnect = () => {};
  }

  private handleMessageEvent = (event: MessageEvent) => {
    const [port] = event.ports;
    if (!port) {
      return;
    }
    this.emit('new_socket', new MessageChannelTransportSocket(port));
  };
}
