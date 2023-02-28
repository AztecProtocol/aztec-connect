import { EthereumProvider, RequestArguments } from '@aztec/barretenberg/blockchain';
import { SignClient } from '@walletconnect/sign-client/dist/types/client.js';
import { SessionTypes } from '@walletconnect/types';
import { RPCWrapper } from '../rpc_wrapper.js';

export class EIP1193SignClient implements EthereumProvider {
  private rpc: RPCWrapper;

  constructor(signClient: SignClient, public chainId: number, public session: SessionTypes.Struct) {
    this.rpc = new RPCWrapper(signClient);
  }

  request({ method, params }: RequestArguments) {
    if (!Array.isArray(params)) {
      throw new Error('Non-array params transport is not implemented');
    }
    return this.rpc.request(this.session.topic, `aztec:${this.chainId}`, {
      method,
      params,
    });
  }

  on(): this {
    throw new Error('Not implemented');
  }

  removeListener(): this {
    throw new Error('Not implemented');
  }
}
