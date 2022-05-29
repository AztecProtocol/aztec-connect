import { AztecSdk, toBaseUnits } from '@aztec/sdk';
import puppeteer, { Browser, Page } from 'puppeteer';
import createDebug from 'debug';
import { randomBytes } from 'crypto';
import { createFundedWalletProvider } from './create_funded_wallet_provider';

declare global {
  interface Window {
    ethereum: any;
    aztecSdk: AztecSdk;
    terminalPrompting: () => boolean;
    injectProvider: (host: string) => void;
  }
}

const {
  ETHEREUM_HOST = 'http://localhost:8545',
  SDK_HOST = 'http://localhost:1234',
  HUMMUS_HOST = 'http://localhost:8080',
  PRIVATE_KEY = '',
} = process.env;

jest.setTimeout(20 * 60 * 1000);

/**
 * Run the following:
 * blockchain: yarn start:ganache
 * halloumi: yarn start:e2e
 * falafel: yarn start:e2e
 * sdk: yarn start
 * end-to-end: yarn test ./src/e2e_hosted_sdk.test.ts
 */

describe('hummus terminal test', () => {
  let browser: Browser;
  let page: Page;
  let privateKey: Buffer;
  const debug = createDebug('bb:e2e_hosted_sdk');

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.CHROME_BIN,
      args: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    page = await browser.newPage();

    // Print out console log lines from the browser.
    const browserDebug = createDebug('bb:e2e_hosted_sdk:browser');
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
      async (host, privateKeyStr) => {
        window.injectProvider(host);
        window.ethereum.addAccount(Buffer.from(privateKeyStr, 'hex'));
      },
      host,
      privateKey.toString('hex'),
    );
  }

  async function waitUntilPrompting() {
    return await page.evaluate(async () => {
      while (!window.terminalPrompting()) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    });
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
        const accountId = await window.aztecSdk.getAccountId(alias, 1);
        return window.aztecSdk.getBalance(assetId, accountId!);
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

    await sendCommand(`init ${SDK_HOST}`);
    const alias = randomBytes(4).toString('hex');
    await sendCommand(`register ${alias}`);
    await sendCommand(`deposit 0.5`);
    await page.evaluate(async () => window.aztecSdk.awaitAllUserTxsSettled());

    expect(await getBalance(alias, 0)).toBe(toBaseUnits('0.5', 18));

    await sendCommand(`balance 0`);
    await sendCommand(`balance 1`);

    await sendCommand(`defi 0.01 1 0 1`);
    await page.evaluate(async () => window.aztecSdk.awaitAllUserTxsSettled());

    // Flushing claim through with a withdraw.
    await sendCommand(`withdraw 0.1`);
    await page.evaluate(async () => window.aztecSdk.awaitAllUserTxsClaimed());

    await sendCommand(`balance 0`);
    await sendCommand(`balance 1`);

    expect(await getBalance(alias, 1)).toBeGreaterThan(0n);
  });
});
