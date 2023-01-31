import 'log-timestamp';
import WebSocket from 'ws';
import { Server } from './server.js';

async function main() {
  // basic nym config
  // TODO: move to a config file
  const HOST = process.env.HOST || '127.0.0.1';
  const nymPort = process.env.NYM_PORT || '1977';
  const nymClientUrl = `ws:${HOST}:${nymPort}`;
  let connection: WebSocket;

  const startServer = (conn: WebSocket) => new Server(conn);
  connection = await connectWebSocket(nymClientUrl, startServer);

  const shutdown = () => {
    connection.close();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

const connectWebSocket = (url: string, cb: (ws: WebSocket) => Server): Promise<WebSocket> => {
  return new Promise(resolve => {
    try {
      const ws = new WebSocket(url);
      ws.on('open', () => {
        console.log('conn opened');
        cb(ws);
        resolve(ws);
      });
      ws.on('error', (err: Error) => {
        console.log('conn error', err);
        // retry
        setTimeout(() => connectWebSocket(url, cb), 5000);
      });

      ws.on('close', () => console.log('WebSocket closed'));
    } catch (error) {
      console.log('Unable to instantiate websocket: ', error);
    }
  });
};

main().catch(err => {
  console.log(err);
  process.exit(1);
});
