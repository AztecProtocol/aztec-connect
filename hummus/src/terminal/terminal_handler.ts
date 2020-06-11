import { App } from '../app';
import { MemoryFifo } from 'barretenberg-es/fifo';
import { User } from '../user';
import { Terminal } from './terminal';
import copy from 'copy-to-clipboard';

export class TerminalHandler {
  private cmdQueue = new MemoryFifo<string>();
  private printQueue = new MemoryFifo<string | undefined>();
  private preInitCmds = { help: this.help, init: this.init, exit: this.onExit, cleardata: this.clearData };
  private postInitCmds = {
    help: this.help,
    deposit: this.deposit,
    withdraw: this.withdraw,
    transfer: this.transfer,
    balance: this.balance,
    user: this.user,
    adduser: this.addUser,
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
    this.app.on('log', (str: string) => this.printQueue.put(str));
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
    this.printQueue.put('[]optional <>required\n');
    if (!this.app.isInitialized()) {
      this.printQueue.put('init [server]\nexit\n');
    } else {
      this.printQueue.put(
        'deposit <amount>\n' +
          'withdraw <amount>\n' +
          'transfer <to> <amount>\n' +
          'balance [id/alias]\n' +
          'user [id/alias]\n' +
          'adduser <alias> [pubkey]\n' +
          'copykey\n' +
          'status\n' +
          'exit\n',
      );
    }
  }

  private async init(server: string) {
    this.printQueue.put('initializing...\n');
    await this.app.init(server || window.location.protocol + '//' + window.location.hostname);

    try {
      const { dataSize, dataRoot, nullRoot } = await this.app.getStatus();
      this.printQueue.put(`data size: ${dataSize}\n`);
      this.printQueue.put(`data root: ${dataRoot.slice(0, 8).toString('hex')}...\n`);
      this.printQueue.put(`null root: ${nullRoot.slice(0, 8).toString('hex')}...\n`);
    } catch (err) {
      this.printQueue.put('Failed to get server status.\n');
    }
    this.printQueue.put(`user: ${this.app.getUser().publicKey.slice(0, 4).toString('hex')}...\n`);
    this.printQueue.put(`balance: ${this.app.getBalance()}\n`);
  }

  private async deposit(value: string) {
    this.printQueue.put(`generating deposit proof...\n`);
    await this.app.deposit(+value);
    this.printQueue.put(`deposit proof sent.\n`);
  }

  private async withdraw(value: string) {
    this.printQueue.put(`generating withdrawl proof...\n`);
    await this.app.withdraw(+value);
    this.printQueue.put(`withdrawl proof sent.\n`);
  }

  private async transfer(userIdOrAlias: string, value: string) {
    const user = this.app.findUser(userIdOrAlias, true);
    if (!user) {
      throw new Error('User not found.');
    }
    this.printQueue.put(`generating transfer proof...\n`);
    await this.app.transfer(+value, user.publicKey.toString('hex'));
    this.printQueue.put(`transfer proof sent.\n`);
  }

  private async balance(userIdOrAlias: string) {
    await this.terminal.putString(`${this.app.getBalance(userIdOrAlias)}\n`);
  }

  private async user(userIdOrAlias?: string) {
    if (userIdOrAlias) {
      const user = this.app.switchToUser(userIdOrAlias);
      this.printQueue.put(
        `switched to ${user.publicKey.toString('hex').slice(0, 8)}...\nbalance ${this.app.getBalance()}\n`,
      );
    } else {
      const str = this.app.getUsers().map(this.userStr).join('');
      this.printQueue.put(str);
    }
  }

  private async addUser(alias: string, publicKeyStr?: string) {
    if (!publicKeyStr) {
      const user = await this.app.createUser(alias);
      this.printQueue.put(this.userStr(user));
    } else {
      const publicKey = Buffer.from(publicKeyStr, 'hex');
      if (publicKey.length !== 64) {
        throw new Error('Bad public key.');
      }
      const user = await this.app.addUser(alias, publicKey);
      this.printQueue.put(this.userStr(user));
    }
  }

  private async copyKey() {
    copy(this.app.getUser().publicKey.toString('hex'));
  }

  private async status() {
    this.printQueue.put(`data size: ${this.app.getDataSize()}\n`);
    this.printQueue.put(`data root: ${this.app.getDataRoot().slice(0, 8).toString('hex')}...\n`);
  }

  private async clearData() {
    await this.app.clearNoteData();
  }

  private userStr(u: User) {
    return (
      `${u.id}: ${u.publicKey.slice(0, 4).toString('hex')}...` +
      (u.alias ? ` (${u.alias})` : '') +
      (u.privateKey ? ' *' : '') +
      '\n'
    );
  }
}
