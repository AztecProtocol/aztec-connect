# Blockchain-Cli

A utility cli for testing / interacting with a local sequencer. The cli contains a number of utility functions to quickly

## Running

1. Run `yarn build`
2. Run `yarn start`

## Usage

Running the cli with no arguments will prompt the following help menu:
You can run help on any command to see the list of options.

```
Usage: dest [options] [command]

Options:
  -h, --help                                                                             display help for command

Commands:
  findAliasCollisions <alias> [url] [rollupProviderUrl] [memoryDb]                       computes case-variations for the alias and prints them
  deriveKeys <mnemonic>                                                                  derive keys
  pkFromStore <file> [password]                                                          print a private key from an encrypted keystore file
  pkFromMnemonic <mnemonic> [derivation path]                                            print a private key derived from a mnemonic
  setTime <time> [url]                                                                   advance the blockchain time
  decodeError <contractAddress> <contractName> <txHash> [url]                            attempt to decode the error for a reverted transaction
  decodeSelector <contractAddress> <contractName> <selector> [url]                       attempt to decode the selector for a reverted transaction
  finaliseDefi <rollupAddress> <nonce> [url]                                             finalise an asynchronous defi interaction
  extractEvents <contractAddress> <contractName> <eventName> <from> [to] [url]           extract events emitted from a contract
  purchaseTokens <token> <tokenQuantity> [spender] [recipient] [maxAmountToSpend] [url]  purchase tokens for an account
  getBalance <token> [account] [url]                                                     display token/ETH balance for an account
  selectors <contractAddress> <contractName> [type] [url]                                display useful information about a contract selectors
  profileElement <rollupAddress> <elementAddress> <rollupProviderUrl> <from> [to] [url]  provides details of element defi interactions
  mainnet                                                                                display useful addresses for mainnet
  help [command]                                                                         display help for command
```

## Env vars

| Name        | Description                              | Default |
| ----------- | ---------------------------------------- | ------- |
| PRIVATE_KEY | Private key to run the cli with a signer | None    |

## General

**deriveKeys**
Derive keys is a useful cli that can create all of the secrets required to run the aztec system from one mnemonic. You can create a key hierarchy definition, then generate all of the keys you require, outputting them into the terminal so that they can be sourced.

### Notes

JSON files inside `/src/abis` are symlinked to files inside the contracts out folder

The `@aztec/sdk` version can differ between deployments, e.g., production might differ from devnet etc.