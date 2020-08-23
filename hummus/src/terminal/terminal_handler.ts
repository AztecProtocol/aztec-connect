import { App, AppEvent, AppInitState, AppInitStatus, AppInitAction } from '../app';
import { MemoryFifo, SdkEvent, AssetId } from 'aztec2-sdk';
import { Terminal } from './terminal';
import copy from 'copy-to-clipboard';
import { GrumpkinAddress, EthAddress } from 'barretenberg/address';
import { EthProviderEvent } from '../eth_provider';

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
  private cmdQueue = new MemoryFifo<string>();
  private printQueue = new MemoryFifo<string | TermControl>();
  private preInitCmds = { help: this.help, init: this.init, exit: this.onExit, cleardata: this.clearData };
  private postInitCmds = {
    help: this.help,
    mint: this.mint,
    approve: this.approve,
    deposit: this.deposit,
    withdraw: this.withdraw,
    transfer: this.transfer,
    pubtransfer: this.publicTransfer,
    balance: this.balance,
    copykey: this.copyKey,
    status: this.status,
    exit: this.onExit,
    cleardata: this.clearData,
  };

  constructor(private app: App, private terminal: Terminal, private onExit: () => void) {}

  public start() {
    this.processCommands();
    this.processPrint();
    this.printQueue.put("\x01\x01\x01\x01aztec zero knowledge terminal.\x01\ntype command or 'help'\n");
    this.printQueue.put(TermControl.PROMPT);
    this.terminal.on('cmd', (cmd: string) => this.cmdQueue.put(cmd));
  }

  /**
   * Registered before the app has been initialized, unregistered after.
   */
  private initProgressHandler = (initStatus: AppInitStatus) => {
    const msg = this.getInitString(initStatus);
    if (msg) {
      this.printQueue.put(msg + '\n');
    }
  };

  /**
   * Called after the app has been initialized.
   */
  private registerHandlers() {
    // If the app transitions to initializing state, lock the terminal until it is initialized again.
    this.app.on(AppEvent.UPDATED_INIT_STATE, (initStatus: AppInitStatus) => {
      switch (initStatus.initState) {
        case AppInitState.INITIALIZING:
          this.printQueue.put(TermControl.LOCK);
          const msg = this.getInitString(initStatus);
          if (msg) {
            this.printQueue.put('\r' + msg + '\n');
          }
          break;
        case AppInitState.INITIALIZED:
          this.printQueue.put(TermControl.PROMPT);
          break;
      }
    });

    // If the users balance updates, print an update.
    this.app.on(SdkEvent.UPDATED_USER_STATE, (account: EthAddress, balance: bigint, diff: bigint, assetId: AssetId) => {
      const user = this.app.getUser();
      if (user.getUserData().ethAddress.equals(account) && diff) {
        const userAsset = user.getAsset(assetId);
        this.printQueue.put(
          `balance updated: ${userAsset.fromErc20Units(balance)} (${diff >= 0 ? '+' : ''}${userAsset.fromErc20Units(
            diff,
          )})\n`,
        );
      }
    });

    // If the account changes, print an update.
    this.app.on(AppEvent.UPDATED_ACCOUNT, (account: EthAddress) => {
      this.printQueue.put(`user: ${account.toString().slice(0, 12)}...\n`);
    });
  }

  private getInitString({ initAction, network, message }: AppInitStatus) {
    switch (initAction) {
      case undefined:
        return message;
      case AppInitAction.CHANGE_NETWORK:
        return `set network to ${network}...`;
      case AppInitAction.LINK_PROVIDER_ACCOUNT:
        return `requesting account access...`;
      case AppInitAction.LINK_AZTEC_ACCOUNT:
        return `linking Aztec account...`;
    }
  }

  public stop() {
    this.terminal.stop();
    this.cmdQueue.cancel();
    this.printQueue.cancel();
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
      const cmdStr = await this.cmdQueue.get();
      if (cmdStr === null) {
        break;
      }
      try {
        const [cmd, ...args] = cmdStr.toLowerCase().split(/ +/g);
        if (!this.app.isInitialized()) {
          await this.handleCommand(cmd, args, this.preInitCmds);
        } else {
          await this.handleCommand(cmd, args, this.postInitCmds);
        }
      } catch (err) {
        this.printQueue.put(err.message + '\n');
      }
      this.printQueue.put(TermControl.PROMPT);
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
      this.printQueue.put('init [server]\nexit\n');
    } else {
      this.printQueue.put(
        'approve <amount>\n' +
          'deposit <amount>\n' +
          'withdraw <amount>\n' +
          'transfer <to> <amount>\n' +
          'pubtransfer <to> <amount>\n' +
          'balance\n' +
          'copykey\n' +
          'status\n' +
          'exit\n',
      );
    }
  }

  private async init(server: string) {
    this.app.removeAllListeners(AppEvent.UPDATED_INIT_STATE);
    this.app.on(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);

    await this.app.init(server || window.location.protocol + '//' + window.location.hostname);
    const sdk = this.app.getSdk()!;

    try {
      const { dataSize, dataRoot, nullRoot } = await sdk.getRemoteStatus();
      this.printQueue.put(`data size: ${dataSize}\n`);
      this.printQueue.put(`data root: ${dataRoot.slice(0, 8).toString('hex')}...\n`);
      this.printQueue.put(`null root: ${nullRoot.slice(0, 8).toString('hex')}...\n`);
    } catch (err) {
      this.printQueue.put('failed to get server status.\n');
    }
    this.printQueue.put(`user: ${this.app.getAccount().toString().slice(0, 12)}...\n`);
    await this.balance();

    this.app.off(AppEvent.UPDATED_INIT_STATE, this.initProgressHandler);
    this.registerHandlers();
  }

  private async mint(value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put('requesting mint...\n');
    await userAsset.mint(userAsset.toErc20Units(value));
    await this.balance();
  }

  private async approve(value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put('requesting approval...\n');
    await userAsset.approve(userAsset.toErc20Units(value));
    this.printQueue.put('approval complete.\n');
  }

  private async deposit(valueStr: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    const value = userAsset.toErc20Units(valueStr);
    const tokenBalance = await userAsset.publicBalance();
    if (tokenBalance < value) {
      throw new Error(`insufficient public balance: ${userAsset.fromErc20Units(tokenBalance)}`);
    }
    const tokenAllowance = await userAsset.publicAllowance();
    if (tokenAllowance < value) {
      throw new Error(`insufficient allowance: ${userAsset.fromErc20Units(tokenAllowance)}`);
    }
    this.printQueue.put(`generating deposit proof...\n`);
    await userAsset.deposit(value);
    this.printQueue.put(`deposit proof sent.\n`);
  }

  private async withdraw(value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put(`generating withdrawl proof...\n`);
    await userAsset.withdraw(userAsset.toErc20Units(value));
    this.printQueue.put(`withdrawl proof sent.\n`);
  }

  private async transfer(addressOrAlias: string, value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put(`generating transfer proof...\n`);
    // TODO: Lookup alias.
    // const to = GrumpkinAddress.isAddress(addressOrAlias)
    //   ? GrumpkinAddress.fromString(addressOrAlias)
    //   : GrumpkinAddress.ZERO;
    const to = GrumpkinAddress.fromString(addressOrAlias);
    await userAsset.transfer(userAsset.toErc20Units(value), to);
    this.printQueue.put(`transfer proof sent.\n`);
  }

  private async publicTransfer(ethAddress: string, value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put(`generating transfer proof...\n`);
    const to = EthAddress.fromString(ethAddress);
    await userAsset.publicTransfer(userAsset.toErc20Units(value), to);
    this.printQueue.put(`transfer proof sent.\n`);
  }

  private async balance() {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    await this.printQueue.put(`public: ${userAsset.fromErc20Units(await userAsset.publicBalance())}\n`);
    await this.printQueue.put(`private: ${userAsset.fromErc20Units(userAsset.balance())}\n`);
  }

  private async copyKey() {
    const userData = this.app.getUser().getUserData();
    copy(userData.publicKey.toString());
  }

  private async status() {
    const { dataSize, dataRoot } = this.app.getSdk()!.getLocalStatus();
    this.printQueue.put(`data size: ${dataSize}\n`);
    this.printQueue.put(`data root: ${dataRoot.slice(0, 8).toString('hex')}...\n`);
  }

  private async clearData() {
    await this.app.getSdk()!.clearData();
  }
}
