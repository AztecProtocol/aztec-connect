/**
 * Represents one end of a socket connection.
 * A message sent via `send` will be handled by the corresponding TransportSocket's handler function at the other end.
 * Implementations could use e.g. MessagePorts for communication between browser workers,
 * or WebSockets for communication between processes.
 */
export interface TransportSocket {
  send(msg: any): Promise<void>;
  registerHandler(cb: (msg: any) => Promise<any>): void;
  close();
}

/**
 * An implementation of a TransportSocket using MessagePorts.
 */
export class MessageChannelTransportSocket implements TransportSocket {
  constructor(private port: MessagePort) {}

  async send(msg: any): Promise<void> {
    this.port.postMessage(msg);
  }

  registerHandler(cb: (msg: any) => Promise<any>): void {
    this.port.onmessage = async event => cb(event.data);
  }

  close() {
    this.port.onmessage = null;
    this.port.close();
  }
}
