import { WalletProvider, EthAddress, EthAsset, JsonRpcProvider, EthereumRpc, SendTxOptions } from '@aztec/sdk';
import { buildMnemonicPath } from './agent_key.js';
import { ethTransferCost } from './assets.js';

function getAddressAndKey(provider: WalletProvider, mnemonic: string, bip32Account: number, index: number) {
  const address = provider.addAccountFromMnemonicAndPath(mnemonic, buildMnemonicPath(bip32Account, index));
  const key = provider.getPrivateKeyForAddress(address);
  return { address, key };
}

async function refundFromAccounts(
  provider: WalletProvider,
  mnemonic: string,
  fundingAddress: EthAddress,
  accountStart: number,
  numAccounts: number,
  numAccountIndexes: number,
  gasPriceGwei: number,
) {
  let totalRefunded = 0n;
  let totalStuck = 0n;
  const asset = new EthAsset(provider);
  const transferFee = ethTransferCost(gasPriceGwei);
  for (let i = 0; i < numAccounts; i++) {
    for (let j = 0; j < numAccountIndexes; j++) {
      const account = i + accountStart;
      const { address: sourceAddress } = getAddressAndKey(provider, mnemonic, account, j);
      const sourceBalance = await asset.balanceOf(sourceAddress);
      const fee = transferFee;
      const value = sourceBalance - fee;
      console.log(
        `${account}/${j} - address: ${sourceAddress}, balance: ${asset.fromBaseUnits(
          sourceBalance,
        )}, after fee: ${asset.fromBaseUnits(value)}`,
      );
      if (value > 0) {
        let attemptCount = 1;
        while (true) {
          console.log(
            `attempting to refund funding address ${fundingAddress} from ${sourceAddress} with ${asset.fromBaseUnits(
              value,
            )}, count ${attemptCount}...`,
          );
          try {
            const options: SendTxOptions = {
              maxFeePerGas: BigInt(gasPriceGwei) * 10n ** 9n,
            };
            const txHash = await asset.transfer(value, sourceAddress, fundingAddress, options);
            console.log(`transfer succeeded, hash: ${txHash.toString()}`);
            break;
          } catch (err) {
            console.log(err);
            console.log(`attempt ${attemptCount} failed, will retry...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
          attemptCount++;
        }
        totalRefunded += value;
        const newSourceBalance = await asset.balanceOf(sourceAddress);
        totalStuck += newSourceBalance;
        const newFundingAddressBalance = await asset.balanceOf(fundingAddress);
        console.log(
          `success, new funding address ${fundingAddress} balance: ${asset.fromBaseUnits(newFundingAddressBalance)}`,
        );
      } else {
        totalStuck += sourceBalance;
      }
    }
  }
  console.log(`total refunded to funding account: ${asset.fromBaseUnits(totalRefunded)}`);
  console.log(`total stuck: ${asset.fromBaseUnits(totalStuck)}`);
  const finalFundingAddressBalance = await asset.balanceOf(fundingAddress);
  console.log(`new funding address ${fundingAddress} balance: ${asset.fromBaseUnits(finalFundingAddressBalance)}`);
}
/**
 * This function will generate a set of account/keys and transfer funds from them back to the
 * account owned by the provided private key
 * It builds the list of accounts/keys by iterating
 * accountOffset <= i < accountOffset + numAccounts and
 * 0 <= j < numAccountIndexes
 * in the BIP39 system of key derivation
 * m/44'/60'/0'/i/j
 * @param host Ethereum provider url
 * @param fundingPrivateKey The private key of the account to receive refunds
 * @param mnemonic Seed phrase of the accounts to transfer funds from
 * @param accountOffset The start value for account in the path
 * @param numAccounts The number of accounts from which to construct paths
 * @param numAccountIndexes The number of indexes to use with each path
 * @param gasPriceGwei The gas price value to use in transfer cost estimates
 */
export async function refundAddress(
  host: string,
  fundingPrivateKey: Buffer,
  mnemonic: string,
  accountOffset: number,
  numAccounts: number,
  numAccountIndexes: number,
  gasPriceGwei: number,
) {
  const ethereumProvider = new JsonRpcProvider(host);
  const ethereumRpc = new EthereumRpc(ethereumProvider);
  const provider = new WalletProvider(ethereumProvider);

  let fundingAddress: EthAddress;
  if (fundingPrivateKey.length) {
    fundingAddress = provider.addAccount(fundingPrivateKey);
  } else {
    [fundingAddress] = await ethereumRpc.getAccounts();
  }

  console.log(`Using gas price of ${gasPriceGwei}`);

  await refundFromAccounts(
    provider,
    mnemonic,
    fundingAddress,
    accountOffset,
    numAccounts,
    numAccountIndexes,
    gasPriceGwei,
  );
}
