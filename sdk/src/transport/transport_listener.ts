import EventEmitter from 'events';
import { TransportSocket } from './transport_socket';

/**
 * Once opened, an implementation of a TransportListener will emit `new_socket` events as new clients connect.
 * Possible implementations could include MessageChannels of WebSockets.
 */
export interface TransportListener extends EventEmitter {
  open(): void;

  close(): void;

  on(name: 'new_socket', cb: (client: TransportSocket) => void): this;
}
