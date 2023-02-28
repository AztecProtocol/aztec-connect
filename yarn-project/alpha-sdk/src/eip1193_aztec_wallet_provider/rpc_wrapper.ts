import { SignClient } from '@walletconnect/sign-client/dist/types/client.js';
import { EventEmitter } from 'events';
import { createDebugLogger } from '@aztec/barretenberg/log';
import { ProviderRpcError } from '../index.js';

const debug = createDebugLogger('bb:walletconnect_rpc_wrapper');

const MAX_CHARS_PER_REQUEST = 6000;

type RPCRequestPayload = any[];

interface RPCResponsePayload {
  result?: any;
  error?: ErrorResponse;
}

interface ErrorResponse {
  code: number;
  message: string;
  data?: unknown;
}

interface Request {
  delayedPromise: ReturnType<typeof createRequestPromise>;
  timeoutId: NodeJS.Timeout;
}

interface PartialMessage {
  name;
  chunks: string[];
  total: number;
}

interface EventData {
  id: number;
  chunk: string;
  index: number;
  total: number;
}

function createRequestPromise<T>() {
  let cacheResolve: undefined | ((value: T | PromiseLike<T>) => void);
  let cacheReject: undefined | ((value?: ProviderRpcError) => void);
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    cacheResolve = promiseResolve;
    cacheReject = promiseReject;
  });

  const resolve = (value?: T) => {
    if (cacheResolve) {
      cacheResolve(value as T);
    }
  };
  const reject = (error?: ProviderRpcError) => {
    if (cacheReject) {
      cacheReject(error);
    }
  };

  return {
    promise,
    resolve,
    reject,
  };
}

class ProviderError extends Error {
  constructor(message: string, public code: number, public data?: unknown) {
    super(message);
  }
}

export class RPCWrapper extends EventEmitter {
  private sentRequests: Map<number, Request> = new Map();
  private partialMessages: Map<number, PartialMessage> = new Map();

  constructor(private signClient: SignClient) {
    super();
    this.onSessionEvent = this.onSessionEvent.bind(this);
    this.signClient.on('session_event', this.onSessionEvent);
  }

  public async request(
    topic: string,
    chainId: string,
    { method, params }: { method: string; params: RPCRequestPayload },
    timeout = 300_000,
  ) {
    const paramsString = JSON.stringify(params);
    const chunks = this.chunkString(paramsString, MAX_CHARS_PER_REQUEST);

    const id = this.payloadId();
    const delayedPromise = createRequestPromise();
    this.sentRequests.set(id, {
      delayedPromise,
      timeoutId: setTimeout(() => {
        this.sentRequests.delete(id);
        if (this.partialMessages.has(id)) {
          this.partialMessages.delete(id);
        }
        delayedPromise.reject(new ProviderError('Timeout', -32603));
      }, timeout),
    });

    debug(`Sending request ${method} with id ${id} in ${chunks.length} chunks`);

    await Promise.all(
      chunks.map((chunk, index) =>
        this.signClient.emit({
          topic,
          chainId,
          event: { name: method, data: { id, chunk, index, total: chunks.length } },
        }),
      ),
    );
    return delayedPromise.promise;
  }

  public async respond(
    topic: string,
    chainId: string,
    method: string,
    { id, payload }: { id: number; payload: RPCResponsePayload },
  ) {
    const payloadString = JSON.stringify(payload);
    const chunks = this.chunkString(payloadString, MAX_CHARS_PER_REQUEST);
    debug(`Sending response ${method} for id ${id} in ${chunks.length} chunks`);

    await Promise.all(
      chunks.map((chunk, index) =>
        this.signClient.emit({
          topic,
          chainId,
          event: { name: method, data: { id, chunk, index, total: chunks.length } },
        }),
      ),
    );
  }

  public destroy() {
    this.signClient.off('session_event', this.onSessionEvent);
  }

  private payloadId(): number {
    const date = Date.now() * Math.pow(10, 3);
    const extra = Math.floor(Math.random() * Math.pow(10, 3));
    return date + extra;
  }

  private chunkString(str: string, length: number) {
    const numChunks = Math.ceil(str.length / length);
    const chunks = new Array(numChunks);

    for (let i = 0, o = 0; i < numChunks; ++i, o += length) {
      chunks[i] = str.substr(o, length);
    }

    return chunks;
  }

  private onSessionEvent({
    topic,
    params: { chainId, event },
  }: {
    topic: string;
    params: { chainId: string; event: { name: string; data: EventData } };
  }) {
    const {
      name,
      data: { id, chunk, index, total },
    } = event;
    debug(`Received partial message of ${name} with id ${id} chunk ${index} of ${total}`);

    const partialMessage = this.createOrGetPartialMessage(id, name, total);
    partialMessage.chunks[index] = chunk;

    if (partialMessage.chunks.every(chunk => chunk !== null)) {
      debug(`Received all parts of ${name} with id ${id}`);
      this.partialMessages.delete(id);
      const payload = JSON.parse(partialMessage.chunks.join(''));

      if (this.isRpcResponsePayload(payload)) {
        const request = this.sentRequests.get(id);
        if (request) {
          clearTimeout(request.timeoutId);
          this.sentRequests.delete(id);

          if (payload.result) {
            request.delayedPromise.resolve(payload.result);
          } else if (payload.error) {
            const { message, code, data } = payload.error;
            request.delayedPromise.reject(new ProviderError(message, code, data));
          }
        } else {
          debug('Got response for unknown request', id);
        }
      } else if (this.isRpcRequestPayload(payload)) {
        this.emit('session_request', {
          id,
          topic,
          params: {
            chainId,
            request: {
              method: partialMessage.name,
              params: payload,
            },
          },
        });
      } else {
        debug('Got unknown payload', payload);
      }
    }
  }

  private createOrGetPartialMessage(id: number, name: string, total: number) {
    let partialMessage = this.partialMessages.get(id);
    if (!partialMessage) {
      partialMessage = {
        name,
        chunks: Array(total).fill(null),
        total,
      };
      this.partialMessages.set(id, partialMessage);
    }
    return partialMessage;
  }

  private isRpcRequestPayload(payload: any): payload is RPCRequestPayload {
    return Array.isArray(payload);
  }

  private isRpcResponsePayload(payload: any): payload is RPCResponsePayload {
    return typeof payload === 'object' && payload !== null && ('result' in payload || 'error' in payload);
  }
}
