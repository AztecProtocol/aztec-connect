import { MessageChannelTransportSocket, TransportConnect } from '../../transport';

export class SharedWorkerTransportConnect implements TransportConnect {
  constructor(private sharedWorker: SharedWorker) {}

  async createSocket() {
    return new MessageChannelTransportSocket(this.sharedWorker.port);
  }
}
