import WebSocket from 'ws';

interface MixnetMessage {
  message: string;
  senderTag: string; // Marked when we want to use a 'Single Use Reply Block', a distinct piece of functionality on the mixnet.
  type: 'send' | 'received' | 'selfAddress' | 'error' | 'reply';
  error?: string;
  address?: string; // Present in 'selfAddress' messages
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class Server {
  private connection?: WebSocket;
  private ourAddress?: string;
  private running = false;
  private ready = false;
  private ponged = true;
  private log = (msg: string) => console.log('NymGateway:', msg);

  constructor(private connectionString: string) {
    this.running = true;
  }

  public async start() {
    this.connection = await this.connectWebSocket();
    this.connection.on('message', this.handleNymMessage);
    this.heartbeat();

    // request to find out our address
    this.sendSelfAddressRequest();
  }

  public async stop() {
    this.connection?.close();
  }

  public getAddress() {
    return this.ourAddress;
  }

  public isReady() {
    return this.ready;
  }

  public isRunning() {
    return this.running;
  }

  private async heartbeat() {
    while (this.running) {
      await sleep(1000);

      // if we don't get 'ponged', connection has died
      if (!this.ponged) {
        // kill app
        await this.stop();
      }

      this.ponged = false;
      this.connection?.ping();
    }
    process.emit('SIGINT');
  }

  private handleNymMessage = (req: Buffer) => {
    const message = JSON.parse(req.toString('utf-8')) as any;
    if (message.type === 'error') {
      throw new Error(message.error);
    } else if (message.type === 'selfAddress') {
      this.ourAddress = message.address;

      // server is ready once it has stored ourAddress
      this.ready = true;

      this.log(`\nOur address is: ${this.ourAddress}\n`);
    } else if (message.type === 'received') {
      this.handleReceivedMessage(message);
    }
  };

  private handleReceivedMessage = (msg: MixnetMessage) => {
    const { message: text, senderTag } = msg;

    this.log(`\nReceived message: ${text}`);

    if (senderTag !== null && senderTag !== undefined) {
      this.log('Received with reply surb, returning an ACK\n');
      this.sendReplyMessage('ACK', senderTag);
    }
  };

  private sendReplyMessage(text: string, senderTag: string) {
    if (!this.connection) {
      throw new Error('WebSocket connection not initialised');
    }

    const msg: MixnetMessage = {
      type: 'reply',
      message: text,
      senderTag,
    };

    this.connection.send(JSON.stringify(msg));
  }

  private sendSelfAddressRequest = () => {
    if (!this.connection) {
      throw new Error('WebSocket connection not initialised');
    }

    const request = { type: 'selfAddress' };
    this.connection.send(JSON.stringify(request));
  };

  private connectWebSocket(retryResolve?: (ws: WebSocket) => void): Promise<WebSocket> {
    return new Promise(resolve => {
      try {
        const ws = new WebSocket(this.connectionString);
        ws.on('open', () => {
          this.log('WebSocket connection opened');
          this.addWebSocketListeners(ws);
          const res = retryResolve || resolve;
          res(ws);
        });
        ws.on('error', (err: Error) => {
          this.log(`WebSocket connection error: ${err}`);
          // retry
          setTimeout(() => this.connectWebSocket(retryResolve || resolve), 5000);
        });
      } catch (error) {
        this.log(`Unable to instantiate websocket: ${error}`);
      }
    });
  }

  private addWebSocketListeners(ws: WebSocket) {
    ws.on('error', (err: Error) => {
      this.log(`WebSocket Error: ${err}`);
    });
    ws.on('close', () => {
      this.log('WebSocket closed');
      this.running = false;
      this.ready = false;
    });
    ws.on('pong', () => {
      this.ponged = true;
    });
  }
}
