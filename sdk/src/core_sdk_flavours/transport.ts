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

export class TransportClient extends TransportTransportClient<DispatchMsg> {}
export class TransportServer extends TransportTransportServer<DispatchMsg> {}
export type RequestMessage = TransportRequestMessage<DispatchMsg>;
export type ResponseMessage = TransportResponseMessage<DispatchMsg>;
export type EventMessage = TransportEventMessage<DispatchMsg>;
