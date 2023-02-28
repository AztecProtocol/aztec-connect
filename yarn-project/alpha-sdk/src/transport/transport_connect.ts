import { TransportSocket } from './transport_socket.js';

/**
 * Opens a socket with corresponding TransportListener.
 */
export interface TransportConnect {
  createSocket(): Promise<TransportSocket>;
}
