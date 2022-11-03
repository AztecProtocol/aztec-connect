import { MessageChannelTransportSocket, TransportConnect } from '../../transport/index.js';

export class IframeTransportConnect implements TransportConnect {
  constructor(private window: Window, private targetOrigin: string) {}

  createSocket() {
    const { port1, port2 } = new MessageChannel();
    this.window.postMessage(undefined, this.targetOrigin, [port2]);
    return Promise.resolve(new MessageChannelTransportSocket(port1));
  }
}
