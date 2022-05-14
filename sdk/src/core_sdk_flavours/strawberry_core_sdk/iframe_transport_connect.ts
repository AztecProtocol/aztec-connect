import { MessageChannelTransportSocket, TransportConnect } from '../../transport';

export class IframeTransportConnect implements TransportConnect {
  constructor(private window: Window, private targetOrigin: string) {}

  async createSocket() {
    const { port1, port2 } = new MessageChannel();
    this.window.postMessage(undefined, this.targetOrigin, [port2]);
    return new MessageChannelTransportSocket(port1);
  }
}
