import WebSocket from 'ws';

interface MixnetMessage {
  message: string;
  senderTag: string; // Marked when we want to use a 'Single Use Reply Block', a distinct piece of functionality on the mixnet.
  type: 'send' | 'received' | 'selfAddress' | 'error' | 'reply';
  error?: string;
  address?: string; // Present in 'selfAddress' messages
}

export class Server {
  private connection: WebSocket;
  private ourAddress?: string;
  private log = (msg: string) => console.log('NymGateway:', msg);

  constructor(connection: WebSocket) {
    this.log('creating server');
    this.connection = connection;
    this.connection.on('message', this.handleMessageReceived);

    // find out our address
    this.sendSelfAddressRequest();
  }

  private handleMessageReceived = (req: Buffer) => {
    const message = JSON.parse(req.toString('utf-8')) as any;
    if (message.type === 'error') {
      throw new Error(message.error);
    } else if (message.type === 'selfAddress') {
      // TODO: set our address so we can inform clients
      this.ourAddress = message.address;
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
    const msg: MixnetMessage = {
      type: 'reply',
      message: text,
      senderTag,
    };

    this.connection.send(JSON.stringify(msg));
  }

  private sendSelfAddressRequest = () => {
    const request = { type: 'selfAddress' };
    this.connection.send(JSON.stringify(request));
  };
}
