import { Text } from '../display';

export interface TerminalBuffer {
  argv: string[];
  options: { [opt: string]: string };
  log: (content: Text[]) => Promise<any>;
  removeLog: (numberOfLines: number) => Promise<any>;
}

export const loading = (buf: TerminalBuffer) => {
  const loader = ['|', '/', '-', '\\'];
  let isLoading = false;
  let logged = false;
  let i = 0;
  const printToBuf = async () => {
    if (!isLoading) {
      return;
    }

    if (logged) {
      await buf.removeLog(1);
    }
    await buf.log([{ text: loader[i] }]);
    logged = true;
    i = (i + 1) % loader.length;
    setTimeout(async () => {
      printToBuf();
    }, 300);
  };

  const start = () => {
    isLoading = true;
    printToBuf();
  };

  const stop = async () => {
    isLoading = false;
    if (logged) {
      await buf.removeLog(1);
      logged = false;
    }
  };

  return { start, stop };
};
