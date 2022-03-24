import { DispatchMsg, TransportServer } from '../transport';
import { ServiceWorkerBackend } from './service_worker_backend';
import { ServiceWorkerTransportListener } from './service_worker_transport_listener';

declare const self: ServiceWorkerGlobalScope;

function main() {
  const serviceWorkerBackend = new ServiceWorkerBackend();

  /**
   * Messages from our transport layer, are function calls to be dispatched to serviceWorkerBackend.
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
  const dispatchFn = async ({ fn, args }: DispatchMsg) => serviceWorkerBackend[fn](...args);
  const listener = new ServiceWorkerTransportListener(self);
  const transportServer = new TransportServer(listener, dispatchFn);
  serviceWorkerBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));

  transportServer.start();

  self.addEventListener('install', async () => {
    await self.skipWaiting();
  });

  self.addEventListener('activate', async () => {
    await self.clients.claim();
  });
}

main();
