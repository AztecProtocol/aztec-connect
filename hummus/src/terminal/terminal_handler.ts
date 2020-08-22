import { App } from '../app';
import { MemoryFifo, SdkEvent, AssetId } from 'aztec2-sdk';
import { Terminal } from './terminal';
import copy from 'copy-to-clipboard';
import { GrumpkinAddress, EthAddress } from 'barretenberg/address';
import { EthProviderEvent } from '../eth_provider';

export class TerminalHandler {
  private cmdQueue = new MemoryFifo<string>();
  private printQueue = new MemoryFifo<string | undefined>();
  private preInitCmds = { help: this.help, init: this.init, exit: this.onExit, cleardata: this.clearData };
  private postInitCmds = {
    help: this.help,
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
    this.printQueue.put(undefined);
    this.terminal.on('cmd', (cmd: string) => this.cmdQueue.put(cmd));
    this.app.on(SdkEvent.LOG, (str: string) => this.printQueue.put(str + '\n'));
    this.app.on(SdkEvent.UPDATED_USER_STATE, (account: EthAddress, balance: number, diff: number) => {
      if (diff) {
        this.printQueue.put(`balance updated: ${balance / 100} (${diff >= 0 ? '+' : ''}${diff / 100})\n`);
      }
    });
    this.app.on(EthProviderEvent.UPDATED_ACCOUNT, (account: EthAddress) => {
      this.printQueue.put(`user: ${account}\n`);
      this.printQueue.put(`balance: ${this.getBalance()}\n`);
    });
  }

  public stop() {
    this.terminal.stop();
    this.cmdQueue.cancel();
    this.printQueue.cancel();
  }

  private async processPrint() {
    while (true) {
      const str = await this.printQueue.get();
      if (str === null) {
        break;
      }
      if (str === undefined) {
        await this.terminal.prompt();
      } else {
        if (this.terminal.isPrompting()) {
          await this.terminal.putString('\r' + str);
          this.printQueue.put(undefined);
        } else {
          await this.terminal.putString(str);
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
      this.printQueue.put(undefined);
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
    this.printQueue.put('initializing...\n');
    await this.app.init(server || window.location.protocol + '//' + window.location.hostname);
    const sdk = this.app.getSdk()!;

    try {
      const { dataSize, dataRoot, nullRoot } = await sdk.getRemoteStatus();
      this.printQueue.put(`data size: ${dataSize}\n`);
      this.printQueue.put(`data root: ${dataRoot.slice(0, 8).toString('hex')}...\n`);
      this.printQueue.put(`null root: ${nullRoot.slice(0, 8).toString('hex')}...\n`);
    } catch (err) {
      this.printQueue.put('Failed to get server status.\n');
    }
    this.printQueue.put(`user: ${this.app.getAccount()}...\n`);
    this.printQueue.put(`balance: ${this.getBalance()}\n`);
  }

  private async approve(value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put('requesting approval...');
    await userAsset.approve(userAsset.toErc20Units(value));
    this.printQueue.put('approval complete.');
  }

  private async deposit(value: string) {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    this.printQueue.put(`generating deposit proof...\n`);
    await userAsset.deposit(userAsset.toErc20Units(value));
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
    await this.terminal.putString(`${this.getBalance()}\n`);
  }

  private getBalance() {
    const userAsset = this.app.getUser().getAsset(AssetId.DAI);
    return userAsset.fromErc20Units(userAsset.balance());
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
