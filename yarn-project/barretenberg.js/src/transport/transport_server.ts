import { RequestMessage, ResponseMessage } from './dispatch/messages.js';
import { Listener } from './interface/listener.js';
import { Socket } from './interface/socket.js';

/**
 * Keeps track of clients, providing a broadcast, and request/response api with multiplexing.
 */
export class TransportServer<Payload> {
  private sockets: Socket[] = [];

  constructor(private listener: Listener, private msgHandlerFn: (msg: Payload) => Promise<any>) {}

  start() {
    this.listener.on('new_socket', client => this.handleNewSocket(client));
    this.listener.open();
  }

  /**
   * Stops accepting new connections. It doesn't close existing sockets.
   * It's expected the clients will gracefully complete by closing their end, sending an `undefined` message.
   */
  stop() {
    this.listener.close();
  }

  async broadcast(msg: Payload) {
    await Promise.all(this.sockets.map(s => s.send({ payload: msg })));
  }

  private handleNewSocket(socket: Socket) {
    socket.registerHandler(async msg => {
      if (msg === undefined) {
        // Client socket has closed. Remove it from the list of sockets. Call close on it for any cleanup.
        const socketIndex = this.sockets.findIndex(s => s === socket);
        const [closingSocket] = this.sockets.splice(socketIndex, 1);
        closingSocket.close();
        return;
      }
      return await this.handleSocketMessage(socket, msg);
    });
    this.sockets.push(socket);
  }

  private async handleSocketMessage(socket: Socket, { msgId, payload }: RequestMessage<Payload>) {
    try {
      const data = await this.msgHandlerFn(payload);

      // We may want to devise a better solution to this. We maybe given a view over a non cloneable/transferrable
      // ArrayBuffer (such as a view over wasm memory). In this case we want to take a copy, and then transfer it.
      const respPayload = data instanceof Uint8Array && ArrayBuffer.isView(data) ? new Uint8Array(data) : data;
      const transfer = data instanceof Uint8Array ? [respPayload.buffer] : [];
      const rep: ResponseMessage<Payload> = { msgId, payload: respPayload };

      await socket.send(rep, transfer);
    } catch (err: any) {
      const rep: ResponseMessage<Payload> = { msgId, error: err.stack };
      await socket.send(rep);
    }
  }
}
