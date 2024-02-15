import { AztecSdk } from '@aztec/sdk';
import puppeteer, { Browser, Page } from 'puppeteer';
import createDebug from 'debug';
import { jest } from '@jest/globals';

declare global {
  interface Window {
    ethereum: any;
    aztecSdk: AztecSdk;
    terminalPrompting: () => boolean;
    injectProvider: (host: string, pk: string) => void;
  }
}

jest.setTimeout(20 * 60 * 1000);

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  // For now this is just the rollup provider as we are not using the hosted sdk component.
  // Change back to SDK_HOST once it's ready.
  ROLLUP_HOST = 'http://localhost:8081',
  HUMMUS_HOST = 'http://localhost:8080',
  PRIVATE_KEY = '',
} = process.env;

/**
 * Not really a test. But provides a convenient way of analysing a startup sync.
 * Run falafel pointing it to an ethereum node with a load of data on it.
 * Then run this test and watch it sync.
 */

describe('hummus terminal test', () => {
  let browser: Browser;
  let page: Page;
  let privateKey: Buffer;
  const debug = createDebug('bb:e2e_browser');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_BIN,
      args: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage', '--disk-cache-dir=/dev/null'],
    });

    page = await browser.newPage();

    // Print out console log lines from the browser.
    const browserDebug = createDebug('bb:e2e_browser:page');
    page.on('console', msg => {
      const value = msg.args()[0]?._remoteObject?.value;
      if (value) {
        browserDebug(value?.replaceAll('%c', ''));
      }
    });

    privateKey = Buffer.from(PRIVATE_KEY, 'hex');

    debug('loading terminal...');
    await page.goto(HUMMUS_HOST, { waitUntil: 'networkidle2' });
    await waitUntilPrompting();
    await injectProvider(ETHEREUM_HOST, privateKey);
  });

  afterAll(async () => {
    await browser.close();
  });

  async function injectProvider(host: string, privateKey: Buffer) {
    await page.evaluate(
      (host, privateKeyStr) => window.injectProvider(host, privateKeyStr),
      host,
      privateKey.toString('hex'),
    );
  }

  async function waitUntilPrompting() {
    return await page.evaluate(() => window.terminalPrompting());
  }

  async function sendCommand(cmd: string) {
    debug(`sending command: ${cmd}`);
    await page.keyboard.type(cmd);
    await page.keyboard.press('Enter');
    await waitUntilPrompting();
  }

  it('should sync', async () => {
    await sendCommand(`init ${ROLLUP_HOST}`);
  });
});
