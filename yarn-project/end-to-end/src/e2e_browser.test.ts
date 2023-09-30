import { AztecSdk, toBaseUnits } from '@aztec/sdk';
import puppeteer, { Browser, Page } from 'puppeteer';
import createDebug from 'debug';
import { randomBytes } from 'crypto';
import { createFundedWalletProvider } from './create_funded_wallet_provider.js';
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

/*
 * Run the following:
 * contracts: ./scripts/start_e2e.sh
 * kebab: yarn start:e2e
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * hummus: yarn start
 * end-to-end: yarn test e2e_hosted_sdk.test.ts
 *
 * If running via docker:
 * end-to-end: ONLY_TARGET=false ../../bootstrap_docker.sh
 * end-to-end: TEST=e2e_browser.test.ts docker-compose -f ./scripts/docker-compose.yml up --force-recreate --exit-code-from end-to-end
 */

describe('hummus terminal test', () => {
  let browser: Browser;
  let page: Page;
  let privateKey: Buffer;
  const debug = createDebug('bb:e2e_browser');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.CHROME_BIN,
      args: [
        '--no-sandbox',
        '--headless',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--remote-debugging-port=9222',
      ],
      dumpio: true,
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

    debug(`funding initial ETH account...`);
    const provider = await createFundedWalletProvider(ETHEREUM_HOST, 1, 1, Buffer.from(PRIVATE_KEY, 'hex'));
    privateKey = provider.getPrivateKey(0);
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

  async function getBalance(alias: string, assetId: number) {
    return await page.evaluate(
      async (alias, assetId) => {
        const accountPublicKey = await window.aztecSdk.getAccountPublicKey(alias);
        return (await window.aztecSdk.getBalance(accountPublicKey!, assetId)).value;
      },
      alias,
      assetId,
    );
  }

  it('should deposit', async () => {
    debug('loading terminal...');
    await page.goto(HUMMUS_HOST, { waitUntil: 'networkidle2' });
    await waitUntilPrompting();
    await injectProvider(ETHEREUM_HOST, privateKey);

    await sendCommand(`init ${ROLLUP_HOST}`);
    const alias = randomBytes(4).toString('hex');
    await sendCommand(`register ${alias}`);
    await sendCommand(`deposit 0.5`);
    await page.evaluate(() => window.aztecSdk.awaitAllUserTxsSettled());

    expect(await getBalance(alias, 0)).toBe(toBaseUnits('0.5', 18));

    await sendCommand(`balance 0`);
    await sendCommand(`balance 1`);

    await sendCommand(`defi 0.01 1 0 1`); // note: updated from uniswap bridge to the dummy bridge
    await page.evaluate(() => window.aztecSdk.awaitAllUserTxsSettled());

    // Flushing claim through with a withdraw.
    await sendCommand(`withdraw 0.1`);
    await page.evaluate(() => window.aztecSdk.awaitAllUserTxsClaimed());

    await sendCommand(`balance 0`);
    await sendCommand(`balance 1`);

    expect(await getBalance(alias, 1)).toBeGreaterThan(0n);
  });
});
