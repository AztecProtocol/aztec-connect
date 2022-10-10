import { DispatchMsg, TransportServer } from '../transport.js';
import { IframeBackend } from './iframe_backend.js';
import { IframeTransportListener } from './iframe_transport_listener.js';
import { sdkVersion } from '../../core_sdk/index.js';
import { IframeEvent } from '../strawberry_core_sdk/create_iframe.js';

function main() {
  const iframeBackend = new IframeBackend(document.referrer);

  /**
   * Messages from our transport layer, are function calls to be dispatched to iframeBackend.
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
  const dispatchFn = ({ fn, args }: DispatchMsg) => iframeBackend[fn](...args);
  const listener = new IframeTransportListener(window);
  const transportServer = new TransportServer(listener, dispatchFn);
  iframeBackend.on('dispatch_msg', (msg: DispatchMsg) => transportServer.broadcast(msg));

  transportServer.start();

  localStorage.setItem('sdkVersion', sdkVersion);
  window.addEventListener('storage', e => {
    if (e.key === 'sdkVersion' && e.newValue !== sdkVersion) {
      window.parent.postMessage(IframeEvent.NEW_VERSION_LOADED, '*');
    }
  });

  window.parent.postMessage(IframeEvent.READY, '*');
}

main();
