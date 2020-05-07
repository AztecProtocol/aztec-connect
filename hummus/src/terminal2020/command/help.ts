import { TerminalBuffer } from './terminal_buffer';

const run = async (buf: TerminalBuffer) => {
  await buf.log([
    { text: '' },
    { text: 'Commands:' },
    {
      text: [
        {
          text: '  init',
          bold: true,
        },
        {
          text: '                    Initialize keys.',
        },
      ],
    },
    {
      text: '  user',
      bold: true,
    },
    {
      text: '  deposit',
      bold: true,
    },
    {
      text: '  withdraw',
      bold: true,
    },
    {
      text: '  transfer',
      bold: true,
    },
    {
      text: [
        {
          text: '  exit',
          bold: true,
        },
        {
          text: '                    Exit terminal mode.',
        },
      ],
    },
    { text: '' },
    {
      text: [
        { text: 'Run `' },
        { text: 'COMMAND -h', bold: true },
        { text: '` for more information on specific commands.' },
      ],
    },
    { text: 'Press ^C to abort current expression, ⌘K to clear terminal buffer.' },
    { text: '' },
  ]);
};

export const help = {
  run,
};
