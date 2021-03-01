import {
  AccountId,
  AppEvent,
  AppInitAction,
  AppInitState,
  AppInitStatus,
  AssetId,
  GrumpkinAddress,
  MemoryFifo,
  SdkEvent,
  UserJoinSplitTx,
  WebSdk,
  TxType,
} from '@aztec/sdk';
import { Terminal } from './terminal';
import createDebug from 'debug';

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
  private assetId = AssetId.ETH;

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
      } catch (err) {
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
    this.app.on(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
    this.app.on(SdkEvent.LOG, this.logHandler);
  }

  private unregisterHandlers() {
    this.app.off(AppEvent.UPDATED_INIT_STATE, this.handleInitStateChange);
    this.app.off(SdkEvent.UPDATED_USER_STATE, this.handleUserStateChange);
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
    if (initStatus.initState === AppInitState.UNINITIALIZED) {
      this.controlQueue.put(async () => {
        this.printQueue.put(TermControl.LOCK);
        this.printQueue.put('\rlogged out. reinitialize.\n');
        this.printQueue.put(TermControl.PROMPT);
        this.unregisterHandlers();
      });
    }
  };

  /**
   * If the users balance updates, print an update.
   */
  private handleUserStateChange = (accountId: AccountId, balance: bigint, diff: bigint, assetId: AssetId) => {
    const user = this.app.getUser();
    if (!user) {
      // Kind of a hack. But this event can emitted when adding a new user and the app doesn't have a handle on it yet.
      return;
    }
    const userData = user.getUserData();
    if (userData.id.equals(accountId) && diff && !user.isSynching()) {
      const userAsset = user.getAsset(assetId);
      this.printQueue.put(
        `balance updated: ${userAsset.fromBaseUnits(balance)} (${diff >= 0 ? '+' : ''}${userAsset.fromBaseUnits(
          diff,
        )})\n`,
      );
    }
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

  private async init(server: string) {
    this.app.off(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.app.off(SdkEvent.LOG, this.logHandler);
    this.unregisterHandlers();

    this.app.on(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.app.on(SdkEvent.LOG, this.logHandler);
    const serverUrl =
      server || (process.env.NODE_ENV === 'production' ? 'https://api.aztec.network/falafel' : 'http://localhost:8081');
    await this.app.init(serverUrl);
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
    this.assertRegistered();
    const userAsset = this.app.getUser().getAsset(this.assetId);
    const value = userAsset.toBaseUnits(valueStr);
    const fee = await this.app.getSdk().getFee(this.assetId, TxType.DEPOSIT);
    await userAsset.deposit(value, fee);
    this.printQueue.put(`deposit proof sent.\n`);
  }

  private async withdraw(value: string) {
    this.assertRegistered();
    const userAsset = this.app.getUser().getAsset(this.assetId);
    const fee = await this.app.getSdk().getFee(this.assetId, TxType.WITHDRAW_TO_WALLET);
    await userAsset.withdraw(userAsset.toBaseUnits(value) - fee, fee);
    this.printQueue.put(`withdrawl proof sent.\n`);
  }

  private async transfer(addressOrAlias: string, value: string) {
    this.assertRegistered();
    const to = await this.app.getSdk().getAccountId(addressOrAlias);
    if (!to) {
      throw new Error(`unknown user: ${addressOrAlias}`);
    }
    const userAsset = this.app.getUser().getAsset(this.assetId);
    const fee = await this.app.getSdk().getFee(this.assetId, TxType.TRANSFER);

    await userAsset.transfer(userAsset.toBaseUnits(value), fee, to);
    this.printQueue.put(`transfer proof sent.\n`);
  }

  private assertRegistered() {
    if (!this.isRegistered()) {
      throw new Error('register an alias first.');
    }
  }

  private isRegistered() {
    return this.app.getUser().getUserData().id.nonce != 0;
  }

  private async registerAlias(alias: string) {
    if (this.isRegistered()) {
      throw new Error('account already has an alias.');
    }
    if (!(await this.app.getSdk().isAliasAvailable(alias))) {
      throw new Error('alias already registered.');
    }
    const user = this.app.getUser();
    const { publicKey: newSigningPublicKey } = await user.getUserData();
    const recoveryPublicKey = GrumpkinAddress.randomAddress();
    const txHash = await user.createAccount(alias, newSigningPublicKey, recoveryPublicKey);
    this.printQueue.put(`registration proof sent.\nawaiting settlement...\n`);
    await this.app.getSdk().awaitSettlement(txHash, 300);
    await this.app.loadLatestAccount();
    // Stop monitoring pre-registration account.
    await user.remove();
    this.printQueue.put(`done.\n`);
  }

  private async balance() {
    const userAsset = this.app.getUser().getAsset(this.assetId);
    this.printQueue.put(`public: ${userAsset.fromBaseUnits(await userAsset.publicBalance())}\n`);
    this.printQueue.put(`private: ${userAsset.fromBaseUnits(userAsset.balance())}\n`);
    const fundsPendingDeposit = await userAsset.getUserPendingDeposit();
    if (fundsPendingDeposit > 0) {
      this.printQueue.put(`pending deposit: ${userAsset.fromBaseUnits(fundsPendingDeposit)}\n`);
    }
  }

  private async fees() {
    const { symbol } = this.app.getSdk().getAssetInfo(this.assetId);
    const { txFees } = this.app.getSdk().getLocalStatus();
    const feeNames = ['DEPOSIT', 'TRANSFER', 'WALLET WITHDRAW', 'CONTRACT WITHDRAW'];
    const baseFee = txFees[this.assetId].baseFeeQuotes[0].fee;
    txFees[this.assetId].feeConstants.forEach((fee, index) => {
      this.printQueue.put(
        `${feeNames[index]}: ${this.app.getSdk().fromBaseUnits(this.assetId, fee + baseFee)} ${symbol}\n`,
      );
    });
  }

  private async status(num = '1', from = '0') {
    const user = this.app.getUser();
    const txs = await user.getJoinSplitTxs();
    const f = Math.max(0, +from);
    const n = Math.min(Math.max(+num, 0), 5);
    const printTx = (tx: UserJoinSplitTx, action: string, value: bigint) => {
      const asset = user.getAsset(tx.assetId);
      this.printQueue.put(
        `${tx.txHash.toString().slice(2, 10)}: ${action} ${asset.fromBaseUnits(value)} ${asset.getInfo().symbol} ${
          tx.settled ? 'settled' : 'pending'
        }\n`,
      );
    };
    for (const tx of txs.slice(f, f + n)) {
      if (tx.publicInput) {
        printTx(tx, 'DEPOSIT', tx.senderPrivateOutput);
      } else if (tx.publicOutput) {
        printTx(tx, 'WITHDRAW', tx.publicOutput);
      } else if (tx.privateInput) {
        // Can't restore fee :(
        printTx(tx, 'TRANSFER', tx.privateInput - tx.senderPrivateOutput);
      } else {
        printTx(tx, 'RECEIVE', tx.recipientPrivateOutput);
      }
    }
  }
}
