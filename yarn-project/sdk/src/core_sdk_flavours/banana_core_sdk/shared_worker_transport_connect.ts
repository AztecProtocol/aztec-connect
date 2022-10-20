import { MessageChannelTransportSocket, TransportConnect } from '../../transport/index.js';

export class SharedWorkerTransportConnect implements TransportConnect {
  constructor(private sharedWorker: SharedWorker) {}

  createSocket() {
    return Promise.resolve(new MessageChannelTransportSocket(this.sharedWorker.port));
  }
}
