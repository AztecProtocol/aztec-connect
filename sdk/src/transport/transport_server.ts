import { RequestMessage, ResponseMessage } from './messages';
import { TransportListener } from './transport_listener';
import { TransportSocket } from './transport_socket';

/**
 * Keeps track of clients, providing a broadcast, and request/response api with multiplexing.
 */
export class TransportServer<Payload> {
  private sockets: TransportSocket[] = [];

  constructor(private listener: TransportListener, private msgHandlerFn: (msg: Payload) => Promise<any>) {}

  start() {
    this.listener.on('new_socket', client => this.handleNewSocket(client));
    this.listener.open();
  }

  stop() {
    this.listener.close();
    this.sockets.forEach(socket => socket.close());
  }

  async broadcast(msg: Payload) {
    await Promise.all(this.sockets.map(s => s.send({ payload: msg })));
  }

  private handleNewSocket(socket: TransportSocket) {
    socket.registerHandler(msg => this.handleSocketMessage(socket, msg));
    this.sockets.push(socket);
  }

  private async handleSocketMessage(socket: TransportSocket, { msgId, payload }: RequestMessage<Payload>) {
    try {
      const data = await this.msgHandlerFn(payload);
      const rep: ResponseMessage<Payload> = { msgId, payload: data };
      await socket.send(rep);
    } catch (err: any) {
      const rep: ResponseMessage<Payload> = { msgId, error: err.message };
      await socket.send(rep);
    }
  }
}
