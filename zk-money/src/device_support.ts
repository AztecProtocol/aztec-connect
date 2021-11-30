export const isIOS = () =>
  ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const isFirefox = () => navigator.userAgent.includes('Firefox');

const hasIndexedDbSupport = () =>
  new Promise(resolve => {
    const db = indexedDB.open('test');
    db.onerror = () => resolve(false);
    db.onsuccess = () => resolve(true);
  });

export type SupportStatus = 'supported' | 'ios-unsupported' | 'firefox-private-unsupported';

export const getSupportStatus = async (): Promise<SupportStatus> => {
  if (isIOS()) return 'ios-unsupported';
  if (isFirefox()) {
    if (!(await hasIndexedDbSupport())) return 'firefox-private-unsupported';
  }
  return 'supported';
};
