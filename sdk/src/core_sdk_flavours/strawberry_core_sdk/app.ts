import { DispatchMsg, TransportServer } from '../transport';
import { IframeBackend } from './iframe_backend';
import { IframeTransportListener } from './iframe_transport';

function main() {
  const iframeBackend = new IframeBackend();

  /**
   * Messages from our transport layer, are function calls to be dispatched to sharedWorkerBackend.
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
  const dispatchFn = async ({ fn, args }: DispatchMsg) => iframeBackend[fn](...args);
  const listener = new IframeTransportListener(window);
  const transportServer = new TransportServer(listener, dispatchFn);
  iframeBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));

  transportServer.start();

  window.parent.postMessage('Ready', '*');
}

main();
