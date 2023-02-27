import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const WebSocket = require('ws');
const fs = require('fs');

let connection;
let ourAddress;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// To run this script from nym-gateway root:
// npm test:address <nym-address>
// NOTE: ensure an instance of nym-client is running locally
async function main() {
  const port = '1977'; // client websocket listens on 1977 by default, change if yours is different
  const localClientUrl = 'ws://127.0.0.1:' + port;

  // Set up and handle websocket connection to our desktop client.
  try {
    connection = await connectWebsocket(localClientUrl);
  } catch (err) {
    console.log(
      'Websocket connection error. Is the client running with <pre>--connection-type WebSocket</pre> on port ' +
        port +
        '?',
    );
  }

  connection.onmessage = function (e) {
    handleResponse(e);
  };

  process.once('SIGINT', () => connection.close());
  process.once('SIGTERM', () => connection.close());
  process.once('SIGUSR1', () => connection.close());

  sendMessageToMixnet();
}

// Send a message to the mixnet.
function sendMessageToMixnet(count) {
  const address = process.argv[2];
  if (!address) {
    throw new Error('No nym address provided as argument.');
  }

  const message = {
    type: 'sendAnonymous',
    message: 'Send Reply Pls',
    recipient: address,
    replySurbs: 1,
  };

  console.log('sending: ', message);

  connection.send(JSON.stringify(message));
}

// Handle any messages that come back down the websocket.
function handleResponse(resp) {
  // hacky workaround for receiving pushed 'text' messages,
  // basically we can either receive proper server responses, i.e. 'error', 'send', 'selfAddress'
  // or actual messages, without any framing, so they do not have 'type' field
  try {
    let response = JSON.parse(resp.data);
    if (response.type == 'error') {
      console.log('Server responded with error: ' + response.message);
    } else if (response.type == 'selfAddress') {
      console.log(response);
      ourAddress = response.address;
      console.log('Our address is: ' + ourAddress);
    } else if (response.type == 'received') {
      handleReceivedTextMessage(response);
    }
  } catch (_) {
    console.log('ERROR: resp.data: ', resp.data);
  }
}

function handleReceivedTextMessage(message) {
  console.log('\nreceived a message!\n👇');

  const text = message.message;
  const senderTag = message.senderTag;

  if (senderTag != null) {
    console.log('text: ', text, '\nreplySurb: ', senderTag);
    // console.log('\nReplying to message\n');
    sendReplyMessageToMixnet(senderTag);
  } else {
    console.log('text:', text);
  }
}

function sendReplyMessageToMixnet(senderTag) {
  const message = {
    type: 'reply',
    message: 'ACK',
    senderTag,
  };

  connection.send(JSON.stringify(message));
}

// Connect to a websocket.
function connectWebsocket(url) {
  return new Promise(function (resolve, reject) {
    const server = new WebSocket(url);
    server.onopen = function () {
      resolve(server);
    };
    server.onerror = function (err) {
      reject(err);
    };
  });
}

main()
  .then(() => {
    console.log('!!DONE!!');
  })
  .catch(err => console.log('ERROR: ', err));
