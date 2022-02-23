export * from './token_store';
export * from './mainnet_addresses';

import { TokenStore } from '.';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import { MainnetAddresses } from '.';
import * as ERC20Abi from '../abis/ERC20.json';
import * as WETHabi from '../abis/WETH9.json';
import { EthAddress } from '@aztec/barretenberg/address';

const getSigner = (ethereumProvider: EthereumProvider, spender: EthAddress) => {
  return new Web3Provider(ethereumProvider).getSigner(spender.toString());
}

export async function purchaseTokens(
  tokenAddress: EthAddress,
  quantityToPurchase: bigint,
  maximumAmountToSpend: bigint,
  provider: EthereumProvider,
  spender: EthAddress,
  recipient?: EthAddress,
) {
  const tokenStore = await TokenStore.create(provider);

  const token = {
    amount: quantityToPurchase,
    erc20Address: tokenAddress,
  };
  try {
    return await tokenStore.purchase(spender, recipient ? recipient : spender, token, maximumAmountToSpend);
  } catch (e) {
    console.log(e);
  }
}

export async function getTokenBalance(tokenAddress: EthAddress, owner: EthAddress, ethereumProvider: EthereumProvider) {
  const tokenContract = new Contract(tokenAddress.toString(), ERC20Abi.abi, new Web3Provider(ethereumProvider));
  const currentBalance = await tokenContract.balanceOf(owner.toString());
  return currentBalance.toBigInt();
}

export async function getTokenAllowance(tokenAddress: EthAddress, owner: EthAddress, spender: EthAddress, ethereumProvider: EthereumProvider) {
  const tokenContract = new Contract(tokenAddress.toString(), ERC20Abi.abi, new Web3Provider(ethereumProvider));
  const currentBalance = await tokenContract.allowance(owner.toString(), spender.toString());
  return currentBalance.toBigInt();
}

export async function approveToken(tokenAddress: EthAddress, owner: EthAddress, spender: EthAddress, ethereumProvider: EthereumProvider, amount: bigint) {
  const signer = getSigner(ethereumProvider, owner);
  const tokenContract = new Contract(tokenAddress.toString(), ERC20Abi.abi, signer);
  const approved = await tokenContract.approve(spender.toString(), amount);
  await approved.wait();
}

export async function transferToken(tokenAddress: EthAddress, spender: EthAddress, recipient: EthAddress, ethereumProvider: EthereumProvider, amount: bigint) {
  const signer = getSigner(ethereumProvider, spender);
  const tokenContract = new Contract(tokenAddress.toString(), ERC20Abi.abi, signer);
  const approved = await tokenContract.transfer(recipient.toString(), amount);
  await approved.wait();
}

export async function approveWeth(owner: EthAddress, spender: EthAddress, amount: bigint, ethereumProvider: EthereumProvider) {
  const signer = getSigner(ethereumProvider, owner);
  const wethContract = new Contract(MainnetAddresses.Tokens['WETH'], WETHabi.abi, signer);
  const approveTx = await wethContract.approve(spender.toString(), amount);
  await approveTx.wait();
}

export async function getWethBalance(owner: EthAddress, ethereumProvider: EthereumProvider) {
  const wethContract = new Contract(MainnetAddresses.Tokens['WETH'], WETHabi.abi, new Web3Provider(ethereumProvider));
  const currentBalance = await wethContract.balanceOf(owner.toString());
  return currentBalance.toBigInt();
}

export async function depositToWeth(spender: EthAddress, amount: bigint, ethereumProvider: EthereumProvider) {
  const signer = getSigner(ethereumProvider, spender);
  const wethContract = new Contract(MainnetAddresses.Tokens['WETH'], WETHabi.abi, signer);
  const balance = (await wethContract.balanceOf(spender.toString())).toBigInt();
  if (balance < amount) {
    const amountToAdd = amount - balance;
    const depositTx = await wethContract.deposit({ value: amountToAdd });
    await depositTx.wait();
  }
}