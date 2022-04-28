import {
  TransportClient as TransportTransportClient,
  TransportServer as TransportTransportServer,
  EventMessage as TransportEventMessage,
  RequestMessage as TransportRequestMessage,
  ResponseMessage as TransportResponseMessage,
} from '../transport';

export interface DispatchMsg {
  fn: string;
  args: any[];
}

export function createDispatchFn(container: any, target: string, debug = console.error) {
  return async ({ fn, args }: DispatchMsg) => {
    debug(`dispatching to ${target}: ${fn}(${args})`);
    if (!container[target][fn] || typeof container[target][fn] !== 'function') {
      debug(`dispatch error, undefined or not a function on ${target}: ${fn}`);
      return;
    }
    return await container[target][fn](...args);
  };
}

export class TransportClient extends TransportTransportClient<DispatchMsg> {}
export class TransportServer extends TransportTransportServer<DispatchMsg> {}
export type RequestMessage = TransportRequestMessage<DispatchMsg>;
export type ResponseMessage = TransportResponseMessage<DispatchMsg>;
export type EventMessage = TransportEventMessage<DispatchMsg>;
