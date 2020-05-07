import { Text } from '../display';

export interface TerminalBuffer {
  argv: string[];
  options: { [opt: string]: string };
  log: (content: Text[]) => Promise<any>;
  removeLog: (numberOfLines: number) => Promise<any>;
}
