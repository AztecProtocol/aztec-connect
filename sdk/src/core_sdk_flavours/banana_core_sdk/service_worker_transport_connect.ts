import { MessageChannelTransportSocket, TransportConnect } from '../../transport';

export class ServiceWorkerTransportConnect implements TransportConnect {
  constructor(private serviceWorker: ServiceWorker) {}

  async createSocket() {
    const { port1, port2 } = new MessageChannel();
    this.serviceWorker.postMessage(undefined, [port2]);
    return new MessageChannelTransportSocket(port1);
  }
}
