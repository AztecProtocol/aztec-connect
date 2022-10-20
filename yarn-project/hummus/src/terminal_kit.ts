import chalk from 'chalk';
import { Writable } from 'stream';

// const options: any = { enabled: true, level: 2 };
// const chalk = new chalkmod.constructor(options);

export class TerminalKit {
  constructor(private stream: Writable) {}

  public white(str = '') {
    this.stream.write(chalk.white(str));
    return this;
  }

  public yellow(str = '') {
    this.stream.write(chalk.yellow(str));
    return this;
  }

  public cyan(str = '') {
    this.stream.write(chalk.cyan(str));
    return this;
  }

  public red(str = '') {
    this.stream.write(chalk.red(str));
    return this;
  }

  public redBright(str = '') {
    this.stream.write(chalk.redBright(str));
    return this;
  }

  public blue(str = '') {
    this.stream.write(chalk.blue(str));
    return this;
  }

  public green(str = '') {
    this.stream.write(chalk.green(str));
    return this;
  }

  public magentaBright(str = '') {
    this.stream.write(chalk.magentaBright(str));
    return this;
  }

  public yellowBright(str = '') {
    this.stream.write(chalk.yellowBright(str));
    return this;
  }

  public grey(str = '') {
    this.stream.write(chalk.gray(str));
    return this;
  }

  public clear() {
    this.moveTo(0, 0);
    this.stream.write('\u001B[2J');
    this.stream.write('\u001B[3J');
  }

  public eraseLine() {
    this.stream.write('\u001B[0K');
  }

  public moveTo(x: number, y: number) {
    this.stream.write(`\u001B[${y + 1};${x + 1}H`);
  }

  public eraseDisplayBelow() {
    this.stream.write('\u001B[0J');
  }

  public eraseDisplayAbove() {
    this.stream.write('\u001B[1J');
  }

  public hideCursor(hide = true) {
    if (hide) {
      this.stream.write('\u001B[?25l');
    } else {
      this.stream.write('\u001B[?25h');
    }
  }

  public saveCursor() {
    this.stream.write('\u001B[s');
  }

  public restoreCursor() {
    this.stream.write('\u001B[u');
  }
}
