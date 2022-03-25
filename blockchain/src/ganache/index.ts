import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { EthAddress } from '@aztec/barretenberg/address';
import { EthereumRpc, TxHash } from '@aztec/barretenberg/blockchain';
import { Command } from 'commander';
import { purchaseTokens, MainnetAddresses, RollupProcessor, JsonRpcProvider } from '..';
import { setBlockchainTime, getCurrentBlockTime } from '../manipulate_blocks';
import { decodeErrorFromContractByTxHash, decodeSelector } from '../contracts/decode_error';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import * as RollupAbi from '../artifacts/contracts/RollupProcessor.sol/RollupProcessor.json';
import * as ElementFactory from '@aztec/bridge-clients/client-dest/typechain-types/factories/ElementBridge__factory';
import { WalletProvider } from '../provider';
import { getTokenBalance, getWethBalance } from '../tokens';

const { PRIVATE_KEY } = process.env;

export const abis: { [key: string]: any } = {
  Rollup: RollupAbi,
  Element: ElementFactory.ElementBridge__factory.abi,
};

const getProvider = (url: string) => {
  if (PRIVATE_KEY) {
    const provider = WalletProvider.fromHost(url);
    const address = provider.addAccount(Buffer.from(PRIVATE_KEY, 'hex'));
    console.log(`Added account ${address.toString()} from provided private key`);
    return provider;
  }
  return new JsonRpcProvider(url);
};

export async function retrieveEvents(
  contractAddress: string,
  contractName: string,
  provider: EthereumProvider,
  eventName: string,
  from: number,
  to?: number,
) {
  const contract = new Contract(contractAddress, abis[contractName].abi, new Web3Provider(provider));
  const filter = contract.filters[eventName]();
  const events = await contract.queryFilter(filter, from, to);
  return events.map(event => contract.interface.parseLog(event));
}

export async function decodeError(
  contractAddress: string,
  contractName: string,
  txHash: TxHash,
  provider: EthereumProvider,
) {
  const web3 = new Web3Provider(provider);
  const contract = new Contract(contractAddress, abis[contractName].abi, web3.getSigner());
  return await decodeErrorFromContractByTxHash(contract, txHash, provider);
}

const program = new Command();

async function main() {
  program
    .command('setTime')
    .description('advance the blockchain time')
    .argument('<time>', 'the time you wish to set for the next block, unix timestamp format')
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (time: any, url: any) => {
      const provider = getProvider(url);
      const date = new Date(parseInt(time));
      await setBlockchainTime(date.getTime(), provider);
      console.log(`New block time ${await getCurrentBlockTime(provider)}`);
    });

  program
    .command('decodeError')
    .description('attempt to decode the error for a reverted transaction')
    .argument('<contractAddress>', 'the address of the deployed contract, as a hex string')
    .argument('<contractName>', 'the name of the contract, valid values: Rollup, Element')
    .argument('<txHash>', 'the tx hash that you wish to decode, as a hex string')
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (contractAddress, contractName, txHash, url) => {
      const provider = getProvider(url);
      const error = await decodeError(contractAddress, contractName, txHash, provider);
      if (!error) {
        console.log(`Failed to retrieve error for tx ${txHash}`);
        return;
      }
      console.log(`Retrieved error for tx ${txHash}`, error);
    });

  program
    .command('finaliseDefi')
    .description('finalise an asynchronous defi interaction')
    .argument('<rollupAddress>', 'the address of the deployed rollup contract, as a hex string')
    .argument('<nonce>', 'the nonce you wish to finalise, as a number')
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (rollupAddress, nonce, url) => {
      const provider = getProvider(url);
      const rollupProcessor = new RollupProcessor(rollupAddress, provider);
      try {
        await rollupProcessor.processAsyncDefiInteraction(parseInt(nonce));
      } catch (err: any) {
        const result = decodeSelector(rollupProcessor.contract, err.error.data.result.slice(2));
        console.log('Failed to process async defi interaction, error: ', result);
      }
    });

  program
    .command('extractEvents')
    .description('extract events emitted from a contract')
    .argument('<contractAddress>', 'the address of the deployed contract, as a hex string')
    .argument('<contractName>', 'the name of the contract, valid values: Rollup, Element')
    .argument('<eventName>', 'the name of the emitted event')
    .argument('<from>', 'the block number to search from')
    .argument('[to]', 'the block number to search to, defaults to the latest block')
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (contractAddress, contractName, eventName, from, to, url) => {
      const provider = getProvider(url);
      const logs = await retrieveEvents(
        contractAddress,
        contractName,
        provider,
        eventName,
        parseInt(from),
        to ? parseInt(to) : undefined,
      );
      console.log(
        'Received event args ',
        logs.map(l => l.args),
      );
    });

  program
    .command('purchaseTokens')
    .description('purchase tokens for an account')
    .argument('<token>', 'any token address or any key from the tokens listed in the mainnet command')
    .argument('<tokenQuantity>', 'the quantity of token you want to attempt to purchase')
    .argument(
      '[spender]',
      'the address of the account to purchase the token defaults to 1st default account 0xf39...',
      undefined,
    )
    .argument('[recipient]', 'the address of the account to receive the tokens defaults to the spender', undefined)
    .argument('[maxAmountToSpend]', 'optional limit of the amount to spend', BigInt(10n ** 21n).toString())
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (token, tokenQuantity, spender, recipient, maxAmountToSpend, url) => {
      const ourProvider = getProvider(url);
      const ethereumRpc = new EthereumRpc(ourProvider);
      const accounts = await ethereumRpc.getAccounts();
      spender = spender ? EthAddress.fromString(spender) : accounts[0];
      recipient = recipient ? EthAddress.fromString(recipient) : spender;

      let requestedToken = token;
      if (!EthAddress.isAddress(token)) {
        requestedToken = MainnetAddresses.Tokens[token];
        if (!requestedToken) {
          console.log(`Unknown token ${token}`);
          return;
        }
      }
      const amountPurchased = await purchaseTokens(
        EthAddress.fromString(requestedToken),
        BigInt(tokenQuantity),
        BigInt(maxAmountToSpend),
        ourProvider,
        spender,
        recipient,
      );
      if (amountPurchased === undefined) {
        console.log(`Failed to purchase ${token}`);
        return;
      }
      console.log(`Successfully purchased ${amountPurchased} of ${token}`);
    });

  program
    .command('getBalance')
    .description('display token/ETH balance for an account')
    .argument('<token>', 'any token address or any key from the tokens listed in the mainnet command')
    .argument(
      '[account]',
      'the address of the account to purchase the token defaults to 1st default account 0xf39...',
      undefined,
    )
    .argument('[url]', 'your ganache url', 'http://localhost:8545')
    .action(async (token, account, url) => {
      const ourProvider = getProvider(url);
      const accounts = await new EthereumRpc(ourProvider).getAccounts();
      account = account ? EthAddress.fromString(account) : accounts[0];
      if (token == 'ETH') {
        const balance = await ourProvider.request({ method: 'eth_getBalance', params: [account.toString()] });
        console.log(`ETH balance of account ${account.toString()}: ${BigInt(balance)}`);
        return;
      }

      let requestedToken = token;
      if (!EthAddress.isAddress(token)) {
        requestedToken = MainnetAddresses.Tokens[token];
        if (!requestedToken) {
          console.log(`Unknown token ${token}`);
          return;
        }
      }

      const ethTokenAddress = EthAddress.fromString(requestedToken);
      const wethAddress = EthAddress.fromString(MainnetAddresses.Tokens['WETH']);
      if (ethTokenAddress.equals(wethAddress)) {
        const balance = await getWethBalance(account, ourProvider);
        console.log(`WETH balance of account ${account}: ${balance}`);
        return;
      }
      const balance = await getTokenBalance(ethTokenAddress, account, ourProvider);
      console.log(`Token ${ethTokenAddress.toString()} balance of account ${account}: ${balance}`);
    });

  program
    .command('mainnet')
    .description('display useful addresses for mainnet')
    .action(() => {
      console.log(MainnetAddresses);
    });

  await program.parseAsync(process.argv);
}

main().catch(err => {
  console.log(`Error thrown: ${err}`);
  process.exit(1);
});
