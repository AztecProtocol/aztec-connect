import { DispatchMsg, TransportServer } from '../transport.js';
import { SharedWorkerBackend } from './shared_worker_backend.js';
import { SharedWorkerTransportListener } from './shared_worker_transport_listener.js';

declare const self: SharedWorkerGlobalScope;

function main() {
  const sharedWorkerBackend = new SharedWorkerBackend();

  /**
   * Messages from our transport layer, are function calls to be dispatched to SharedWorkerBackend.
   * We can descend an arbitrary component stack by adding dispatch functions to classes, and nesting our messages.
   * An example message may look like:
   *   const msg = {
   *     fn: 'coreSdkDispatch',
   *     args: [{
   *       fn: 'getTxFees',
   *       args: [0]
   *     }]
   *   }
   */
  const dispatchFn = ({ fn, args }: DispatchMsg) => sharedWorkerBackend[fn](...args);
  const listener = new SharedWorkerTransportListener(self);
  const transportServer = new TransportServer(listener, dispatchFn);
  sharedWorkerBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));

  transportServer.start();
}

main();
