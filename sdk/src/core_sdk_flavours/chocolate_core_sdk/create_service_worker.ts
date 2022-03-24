async function awaitServiceWorkerReady(sw: ServiceWorker) {
  return new Promise<void>(resolve => {
    const checkState = () => {
      if (sw.state === 'activated') {
        resolve();
        sw.removeEventListener('statechange', checkState);
      }
    };
    sw.addEventListener('statechange', checkState);
    checkState();
  });
}

/**
 * Loads the service worker. The banana sdk calls this as part of it's factory function.
 * Once this returns the service worker can be found at navigator.serviceWorker.controller.
 */
export async function createServiceWorker() {
  // IMPORTANT: This needs to be a variable. Otherwise, parcel will transpile the path to `/__/node_modules/...`.
  const src = 'service_worker.js';
  const registration = await navigator.serviceWorker.register(src, { scope: '/' });
  await registration.update();
  if (!navigator.serviceWorker.controller) {
    // If .controller isn't set, reload the page so that the service worker can take control.
    throw new Error('Reload the page to activate service worker.');
  }
  const sw = (registration.installing || registration.waiting || registration.active)!;
  await awaitServiceWorkerReady(sw);
  return sw;
}
