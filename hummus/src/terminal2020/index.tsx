import createDebug from 'debug';
import React, { PureComponent } from 'react';
import styled from 'styled-components';
import { App } from '../app';
import { command, toArgv, toOptions } from './command';
import { Display, Text } from './display';
import { header } from './header';
import { UserInput } from './user_input';

const debug = createDebug('bb:terminal');

const TerminalContainer = styled.div`
  width: 100%;
  height: 100vh;
  overflow: auto;
  font-family: 'Courier New', Courier, monospace;

  &:focus {
    outline: none;
  }
`;

export interface TerminalProps {
  app: App;
  onExit: () => void;
}

interface State {
  staticContent: Text[];
  focused: boolean;
  input: UserInput | null;
  inputContent: Text[];
  commandHistory: string[];
}

export class Terminal2020 extends PureComponent<TerminalProps, State> {
  private container: any;

  constructor(props: TerminalProps) {
    super(props);

    this.state = {
      staticContent: header,
      focused: false,
      input: null,
      inputContent: [],
      commandHistory: [],
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('paste', this.handlePaste, true);
    this.addNewCommandLine();
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown, true);
    document.removeEventListener('paste', this.handlePaste, true);
  }

  setRef = (ref: any) => {
    this.container = ref;
  };

  handleFocus = () => {
    const { focused, input } = this.state;
    if (focused || !input) return;

    input.focus();
    const inputContent = input.getTextArray();
    this.setState({
      focused: true,
      inputContent,
    });
  };

  handleBlur = () => {
    const { focused, input } = this.state;
    if (!focused || !input) return;

    input.blur();
    const inputContent = input.getTextArray();
    this.setState({
      focused: false,
      inputContent,
    });
  };

  handleKeyDown = (e: any) => {
    const { focused, input } = this.state;
    if (!focused || !input) return;

    const { keyCode: code, key } = e;

    if (e.ctrlKey && code === 67) {
      // ^C
      this.addNewCommandLine();
      return;
    }

    if (e.metaKey && code === 75) {
      // ⌘K
      this.restart();
      return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    let updated = false;
    switch (code) {
      case 8: // delete
        updated = input.deleteChar();
        break;
      case 13: // enter
        this.handleSubmit();
        break;
      case 37: // arrow left
        updated = input.moveCursor(-1);
        break;
      case 38: {
        // arrow up
        updated = this.traceHistory(-1);
        break;
      }
      case 39: // arrow right
        updated = input.moveCursor(1);
        break;
      case 40: {
        // arrow down
        updated = this.traceHistory(1);
        break;
      }
      default:
        if (key.length === 1) {
          input.insert(key);
          updated = true;
        }
    }

    if (updated) {
      const inputContent = input.getTextArray();
      this.setState({ inputContent }, this.scrollToBottom);
    }
  };

  handlePaste = (e: any) => {
    const { focused, input } = this.state;
    if (!focused || !input) return;

    const data = e.clipboardData.getData('text');
    input.insert(data);
    const inputContent = input.getTextArray();
    this.setState({ inputContent });
  };

  handleSubmit = () => {
    const { input } = this.state;
    if (!input) return;

    input.blur();

    const value = input.getValue().trim();
    if (!value) {
      this.addNewCommandLine();
      return;
    }

    if (value === 'exit') {
      this.props.onExit();
      return;
    }

    const newContent = input.getTextArray();
    const { staticContent: prevStaticContent, commandHistory: prevCommandHistory } = this.state;
    const staticContent = [...prevStaticContent, ...newContent];
    const commandHistory = prevCommandHistory.filter(cmd => cmd !== value);
    commandHistory.push(value);

    this.setState(
      {
        staticContent,
        input: null,
        inputContent: [],
        commandHistory,
      },
      async () => this.runCommand(value),
    );
  };

  async runCommand(value: string) {
    const { app } = this.props;
    const argv = toArgv(value);
    const terminalBuf = {
      argv,
      options: toOptions(argv),
      log: this.log,
      removeLog: this.removeLog,
    };
    try {
      await command(terminalBuf, app);
    } catch (e) {
      debug(e);
      await this.log([{ text: `${e}`, color: 'red' }]);
    }

    await this.addNewCommandLine();
  }

  restart() {
    const staticContent = header;
    const input = new UserInput();
    if (this.state.focused) {
      input.focus();
    }
    const inputContent = input.getTextArray();
    this.setState({
      staticContent,
      input,
      inputContent,
    });
  }

  addNewCommandLine() {
    const { input: prevInput, staticContent: prevStaticContent } = this.state;

    let staticContent = prevStaticContent;
    if (prevInput) {
      prevInput.blur();
      const newContent = prevInput.getTextArray();
      staticContent = [...prevStaticContent, ...newContent];
    }
    const input = new UserInput();
    if (this.state.focused) {
      input.focus();
    }
    const inputContent = input.getTextArray();

    this.setState(
      {
        staticContent,
        input,
        inputContent,
      },
      this.scrollToBottom,
    );
  }

  traceHistory(offset: number) {
    const { input, commandHistory } = this.state;
    if (!input) {
      return false;
    }

    const value = input.getValue();
    if (input.historyIdx < 0) {
      input.historyIdx = commandHistory.length;
      input.historyRoot = value;
    }

    let idx = input.historyIdx + offset;

    for (; idx >= 0 && idx < commandHistory.length; idx += offset) {
      const cmd = commandHistory[idx];
      if (cmd.startsWith(input.historyRoot)) {
        input.historyIdx = idx;
        input.replace(cmd);
        return true;
      }
    }

    if (idx >= commandHistory.length) {
      if (input.historyRoot && input.historyRoot !== value) {
        input.replace(input.historyRoot);
        return true;
      }
      if (value) {
        input.deleteAll();
        return true;
      }
    }

    return false;
  }

  scrollToBottom() {
    if (!this.container) return;

    this.container.scrollTop = this.container.scrollHeight;
  }

  log = async (newContent: Text[]) => {
    return new Promise(resolve => {
      const { staticContent: prevStaticContent } = this.state;
      const staticContent = [...prevStaticContent, ...newContent];
      this.setState({ staticContent }, () => {
        this.scrollToBottom();
        resolve();
      });
    });
  };

  removeLog = async (numberOfLines = 1) => {
    return new Promise(resolve => {
      const { staticContent: prevStaticContent } = this.state;
      const staticContent = prevStaticContent.slice(0, prevStaticContent.length - numberOfLines);
      this.setState({ staticContent }, resolve);
    });
  };

  render() {
    const { staticContent, inputContent } = this.state;
    const content = [...staticContent, ...inputContent];

    return (
      <TerminalContainer ref={this.setRef} onFocus={this.handleFocus} onBlur={this.handleBlur} tabIndex={0}>
        <Display content={content} />
      </TerminalContainer>
    );
  }
}
