import { GrumpkinAddress, MemoryFifo, ProofId, SdkEvent, TxType, UserPaymentTx } from '@aztec/sdk';
import createDebug from 'debug';
import { AppEvent, AppInitAction, AppInitState, AppInitStatus, WebSdk } from '../web_sdk';
import { Terminal } from './terminal';

const debug = createDebug('bb:terminal_handler');

enum TermControl {
  PROMPT,
  LOCK,
}

/**
 * The terminal handler is composed of two queues. A command queue and a print queue.
 * Commands are executed in sequence, and prints are printed in sequence.
 * The print queue also accepts terminal control codes for enabling and disabling the prompt.
 * When the terminal emits a command, it will have already locked the terminal (disabled the prompt)
 * and it is the job of the handler to reenable the prompt once the command is handled.
 */
export class TerminalHandler {
  private controlQueue = new MemoryFifo<() => Promise<void>>();
  private printQueue = new MemoryFifo<string | TermControl>();
  private preInitCmds = { help: this.help, init: this.init };
  private postInitCmds = {
    help: this.help,
    // mint: this.mint,
    // approve: this.approve,
    deposit: this.deposit,
    withdraw: this.withdraw,
    transfer: this.transfer,
    register: this.registerAlias,
    balance: this.balance,
    fees: this.fees,
    status: this.status,
  };
  private assetId = 0;

  constructor(private app: WebSdk, private terminal: Terminal) {}

  public start() {
    this.processCommands();
    this.processPrint();
    this.printQueue.put('\x01\x01\x01\x01aztec zero knowledge terminal.\x01\n');

    if (window.ethereum) {
      this.printQueue.put("type command or 'help'\n");
      this.printQueue.put(TermControl.PROMPT);
      this.terminal.on('cmd', this.queueCommand);

      if (this.app.isInitialized()) {
        this.registerHandlers();
      }
    } else {
      this.printQueue.put('requires chrome with metamask.\n');
    }
  }

  /**
   * Called when a command is entered in the terminal.
   * The terminal is locked when this is called.
   * Run the command, and then restore the prompt.
   */
  private queueCommand = (cmdStr: string) => {
    this.controlQueue.put(async () => {
      try {
        const [cmd, ...args] = cmdStr.toLowerCase().split(/ +/g);
        if (!this.app.isInitialized()) {
          await this.handleCommand(cmd, args, this.preInitCmds);
        } else {
          await this.handleCommand(cmd, args, this.postInitCmds);
        }
      } catch (err: any) {
        debug(err);
        this.printQueue.put(err.message + '\n');
      }
      this.printQueue.put(TermControl.PROMPT);
    });
  };

  /**
   * Registered before the app has been initialized, unregistered after.
   * Any initialization messages are added to the print queue.
   */
  private initProgressHandler = (initStatus: AppInitStatus) => {
    const msg = this.getInitString(initStatus);
    if (msg) {
      this.printQueue.put(msg + '\n');
    }
  };

  private logHandler = (msg: string) => {
    this.printQueue.put(msg + '\n');
  };

  /**
   * Called after the app has been initialized.
   */
  private registerHandlers() {
    this.app.on(AppEvent.UPDATED_INIT_STATE, this.handleInitStateChange);
    this.app.on(SdkEvent.DESTROYED, this.handleSdkDestroyed);
    this.app.on(SdkEvent.LOG, this.logHandler);
  }

  private unregisterHandlers() {
    this.app.off(AppEvent.UPDATED_INIT_STATE, this.handleInitStateChange);
    this.app.off(SdkEvent.DESTROYED, this.handleSdkDestroyed);
    this.app.off(SdkEvent.LOG, this.logHandler);
  }

  /**
   * If the app transitions to initializing state, lock the terminal until it is initialized again.
   */
  private handleInitStateChange = (initStatus: AppInitStatus, previousStatus: AppInitStatus) => {
    if (initStatus.initState === AppInitState.INITIALIZING) {
      if (
        initStatus.initAction === AppInitAction.AWAITING_PERMISSION_TO_LINK &&
        previousStatus.initAction === AppInitAction.AWAITING_PROVIDER_SIGNATURE
      ) {
        debug('received request to link account, but already waiting on signature acceptence.');
        this.app.destroy();
      } else if (initStatus.initAction === AppInitAction.AWAITING_PERMISSION_TO_LINK) {
        this.app.linkAccount();
      } else {
        // Lock the terminal.
        this.controlQueue.put(async () => {
          this.printQueue.put(TermControl.LOCK);
          const msg = this.getInitString(initStatus);
          if (msg) {
            this.printQueue.put('\r' + msg + '\n');
          }
        });
      }
    }
    if (initStatus.initState === AppInitState.INITIALIZED) {
      this.controlQueue.put(async () => {
        this.printQueue.put(TermControl.LOCK);
        this.printQueue.put(`\ruser: ${this.app.getAddress().toString().slice(0, 12)}...\n`);
        await this.app.getUser().awaitSynchronised();
        await this.balance();
        this.printQueue.put(TermControl.PROMPT);
      });
    }
  };

  private handleSdkDestroyed = () => {
    this.controlQueue.put(async () => {
      this.printQueue.put(TermControl.LOCK);
      this.printQueue.put('\rlogged out. reinitialize.\n');
      this.printQueue.put(TermControl.PROMPT);
      this.unregisterHandlers();
    });
  };

  private getInitString({ initAction, network }: AppInitStatus) {
    switch (initAction) {
      case AppInitAction.CHANGE_NETWORK:
        return `set network to ${network}...`;
      case AppInitAction.LINK_PROVIDER_ACCOUNT:
        return `requesting account access...`;
      case AppInitAction.AWAITING_PROVIDER_SIGNATURE:
        return `check provider to link aztec account...`;
    }
  }

  public stop() {
    this.terminal.stop();
    this.controlQueue.cancel();
    this.printQueue.cancel();
    this.unregisterHandlers();
  }

  private isTermControl(toBeDetermined: any): toBeDetermined is TermControl {
    return !isNaN(toBeDetermined);
  }

  private async processPrint() {
    while (true) {
      const item = await this.printQueue.get();
      if (item === null) {
        break;
      }
      if (this.isTermControl(item)) {
        switch (item) {
          case TermControl.PROMPT:
            await this.terminal.prompt();
            break;
          case TermControl.LOCK:
            this.terminal.lock();
            break;
        }
      } else {
        if (this.terminal.isPrompting()) {
          await this.terminal.putString('\r' + item);
          this.printQueue.put(TermControl.PROMPT);
        } else {
          await this.terminal.putString(item);
        }
      }
    }
  }

  private async processCommands() {
    while (true) {
      const fn = await this.controlQueue.get();
      if (fn === null) {
        break;
      }
      await fn();
    }
  }

  private async handleCommand(cmd: string, args: string[], cmds: any) {
    if (!cmds[cmd]) {
      return;
    }
    await cmds[cmd].call(this, ...args);
  }

  private async help() {
    if (!this.app.isInitialized()) {
      this.printQueue.put('init [server]\n');
    } else {
      this.printQueue.put(
        // TODO: multi asset support.
        // 'mint <amount> <asset>\n' +
        // 'approve <amount> <asset>\n' +
        'deposit <amount>\n' +
          'withdraw <amount>\n' +
          'transfer <to> <amount>\n' +
          'register <alias>\n' +
          'balance\n' +
          'fees\n' +
          'status [num] [from]\n',
      );
    }
  }

  private async getDeployTag() {
    // If we haven't overridden our deploy tag, we discover it at runtime. All s3 deployments have a file
    // called DEPLOY_TAG in their root containing the deploy tag.
    if (process.env.NODE_ENV === 'production') {
      return await fetch('/DEPLOY_TAG').then(resp => resp.text());
    } else {
      return '';
    }
  }

  private async init(server: string) {
    this.app.off(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.app.off(SdkEvent.LOG, this.logHandler);
    this.unregisterHandlers();

    this.app.on(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.app.on(SdkEvent.LOG, this.logHandler);

    const deployTag = await this.getDeployTag();
    const serverUrl = server || (deployTag ? `https://${deployTag}-sdk.aztec.network/` : 'http://localhost:5000');
    await this.app.init({ serverUrl, debug: true });
    this.app.off(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.app.off(SdkEvent.LOG, this.logHandler);

    const sdk = this.app.getSdk()!;
    try {
      const {
        blockchainStatus: { dataSize, dataRoot, nullRoot },
      } = await sdk.getRemoteStatus();
      this.printQueue.put(`data size: ${dataSize}\n`);
      this.printQueue.put(`data root: ${dataRoot.slice(0, 8).toString('hex')}...\n`);
      this.printQueue.put(`null root: ${nullRoot.slice(0, 8).toString('hex')}...\n`);
    } catch (err) {
      this.printQueue.put('failed to get server status.\n');
    }

    this.printQueue.put(`syncing user: ${this.app.getAddress().toString().slice(0, 12)}...\n`);
    await this.app.getUser().awaitSynchronised();
    await this.balance();

    this.registerHandlers();
  }

  // private async mint(value: string) {
  //   this.assertRegistered();
  //   const userAsset = this.app.getUser().getAsset(this.assetId);
  //   this.printQueue.put('requesting mint...\n');
  //   await userAsset.mint(userAsset.toBaseUnits(value));
  //   await this.balance();
  // }

  // private async approve(value: string) {
  //   const userAsset = this.app.getUser().getAsset(this.assetId);
  //   this.printQueue.put('requesting approval...\n');
  //   await userAsset.approve(userAsset.toBaseUnits(value));
  //   this.printQueue.put('approval complete.\n');
  // }

  private async deposit(valueStr: string) {
    await this.assertRegistered();
    const value = this.app.getSdk().toBaseUnits(this.assetId, valueStr);
    const [fee] = await this.app.getSdk().getDepositFees(this.assetId);
    const publicInput = value.value + fee.value;
    const depositor = this.app.getAddress();
    const userId = (await this.app.getUser().getUserData()).id;
    const controller = await this.app.getSdk().createDepositController(depositor, userId, value, fee);
    const assetBalance = await this.app.getSdk().getPublicBalance(this.assetId, depositor);
    const pendingBalance = await controller.getPendingFunds();
    if (assetBalance + pendingBalance < publicInput) {
      throw new Error('insufficient balance.');
    }
    if (publicInput > pendingBalance) {
      this.printQueue.put(`depositing funds to contract...\n`);
      await controller.depositFundsToContract();
    }
    this.printQueue.put(`generating proof...\n`);
    await controller.createProof();
    this.printQueue.put(`signing proof...\n`);
    await controller.sign();
    await controller.send();
    this.printQueue.put(`deposit proof sent.\n`);
  }

  private async withdraw(valueStr: string) {
    await this.assertRegistered();
    const userId = (await this.app.getUser().getUserData()).id;
    const recipient = this.app.getAddress();
    const value = this.app.getSdk().toBaseUnits(this.assetId, valueStr);
    const [fee] = await this.app.getSdk().getWithdrawFees(this.assetId);
    const controller = await this.app.getSdk().createWithdrawController(userId, recipient, value, fee);
    await controller.createProof();
    await controller.send();
    this.printQueue.put(`withdrawl proof sent.\n`);
  }

  private async transfer(alias: string, valueStr: string) {
    await this.assertRegistered();
    const to = await this.app.getSdk().getAccountId(alias);
    if (!to) {
      throw new Error(`unknown user: ${alias}`);
    }
    const userId = (await this.app.getUser().getUserData()).id;
    const value = this.app.getSdk().toBaseUnits(this.assetId, valueStr);
    const [fee] = await this.app.getSdk().getTransferFees(this.assetId);
    const controller = await this.app.getSdk().createTransferController(userId, to, value, fee);
    await controller.createProof();
    await controller.send();
    this.printQueue.put(`transfer proof sent.\n`);
  }

  private async assertRegistered() {
    if (!(await this.isRegistered())) {
      throw new Error('register an alias first.');
    }
  }

  private async isRegistered() {
    return (await this.app.getUser().getUserData()).id.accountNonce != 0;
  }

  private async registerAlias(alias: string) {
    if (await this.isRegistered()) {
      throw new Error('account already has an alias.');
    }
    if (!(await this.app.getSdk().isAliasAvailable(alias))) {
      throw new Error('alias already registered.');
    }
    const fee = (await this.app.getSdk().getRegisterFees({ assetId: this.assetId, value: 0n }))[0];
    const user = this.app.getUser();
    const { id, publicKey: newSigningPublicKey } = await user.getUserData();
    const recoveryPublicKey = GrumpkinAddress.randomAddress();
    const address = this.app.getAddress();
    await this.app.getSdk().addUser(this.app.getAddress(), 1);
    const controller = await this.app
      .getSdk()
      .createRegisterController(id, alias, newSigningPublicKey, recoveryPublicKey, fee.assetId, fee.value, address);
    const pendingDeposit = await controller.getPendingFunds();
    if (pendingDeposit < fee.value) {
      await controller.depositFundsToContract();
    }
    await controller.createProof();
    await controller.sign();
    await controller.send();
    this.printQueue.put(`registration proof sent.\nawaiting settlement...\n`);
    await controller.awaitSettlement(300);
    await this.app.loadLatestAccount();
    // Stop monitoring pre-registration account.
    await user.remove();
    this.printQueue.put(`done.\n`);
  }

  private async balance() {
    const sdk = this.app.getSdk();
    const address = this.app.getAddress();
    const userId = (await this.app.getUser().getUserData()).id;
    this.printQueue.put(
      `public: ${sdk.fromBaseUnits(this.assetId, await sdk.getPublicBalance(this.assetId, address))}\n`,
    );
    this.printQueue.put(`private: ${sdk.fromBaseUnits(this.assetId, await sdk.getBalance(this.assetId, userId))}\n`);
    const fundsPendingDeposit = await sdk.getUserPendingDeposit(this.assetId, address);
    if (fundsPendingDeposit > 0) {
      this.printQueue.put(`pending deposit: ${sdk.fromBaseUnits(this.assetId, fundsPendingDeposit)}\n`);
    }
  }

  private async fees() {
    const { symbol } = this.app.getSdk().getAssetInfo(this.assetId);
    const txTypes = [
      TxType.ACCOUNT,
      TxType.DEPOSIT,
      TxType.TRANSFER,
      TxType.WITHDRAW_TO_WALLET,
      TxType.WITHDRAW_TO_CONTRACT,
    ];
    const txFees = await this.app.getSdk().getTxFees(this.assetId);
    txTypes.forEach(txType => {
      this.printQueue.put(
        `${TxType[txType]}: ${this.app.getSdk().fromBaseUnits(this.assetId, txFees[txType][0].value)} ${symbol}\n`,
      );
    });
  }

  private async status(num = '1', from = '0') {
    const user = this.app.getUser();
    const txs = await user.getPaymentTxs();
    const f = Math.max(0, +from);
    const n = Math.min(Math.max(+num, 0), 5);
    const printTx = (tx: UserPaymentTx, action: string, value: bigint) => {
      const asset = this.app.getSdk().getAssetInfo(tx.value.assetId);
      this.printQueue.put(
        `${tx.txId.toString().slice(2, 10)}: ${action} ${this.app.getSdk().fromBaseUnits(this.assetId, value)} ${
          asset.symbol
        } ${tx.settled ? 'settled' : 'pending'}\n`,
      );
    };
    for (const tx of txs.slice(f, f + n)) {
      const { value } = tx.value;
      if (!tx.isSender) {
        printTx(tx, 'RECEIVE', value);
        return;
      }
      printTx(tx, ProofId[tx.proofId], value);
    }
  }
}
