import createDebug from 'debug';
import { useCallback, useMemo } from 'react';
import { EthAddress, TxId } from '@aztec/sdk';
import { Contract } from '@ethersproject/contracts';
import { useStableEthereumProvider, useGasUnitPrice } from '../top_level_context/index.js';
import { usePolledCallback } from '../../app/util/polling_hooks.js';
import { useRollupProviderStatus } from '../rollup_provider_hooks.js';

const debug = createDebug('zm:fee_hooks');

const ROLLUP_ABI = [
  'function depositPendingFunds(uint256 assetId, uint256 amount, address owner, bytes32 proofHash) external payable',
  'function approveProof(bytes32 _proofHash) external',
];

async function getDepositFundsGasEstimate(contract: Contract, fromAddressStr: string, assetId: number) {
  // TODO: Gas estimation methods throw, and possibily have been throwing for a very long time. When
  // this is eventually fixed, the estimation step should be moved into the sdk, rather than left to
  // zk-money to calculate. In the meantime we'll save ourselves some infura calls and just hardcode
  // in the fallback values.
  return 70000n;

  // // A non-zero value indicates some token is has to be transfered
  // const ethValue = assetId === 0 ? 1n : 0n;
  // const tokenValue = assetId === 0 ? 0n : 1n;
  // const proofHash = TxId.random().toString();
  // try {
  //   // Still reverts :-/
  //   const gas = await contract.estimateGas.depositPendingFunds(assetId, tokenValue, fromAddressStr, proofHash, {
  //     value: ethValue,
  //   });
  //   return BigInt(gas.toString());
  // } catch (e) {
  //   debug('depositPendingFunds gas estimate failed:', { assetId, tokenValue, fromAddressStr, proofHash, ethValue }, e);
  //   // Probably not enough balance.
  //   return 70000n;
  // }
}

async function getApproveProofGasEstimate(contract: Contract) {
  const proofHash = TxId.random().toString();
  try {
    const bigNumber = await contract.estimateGas.approveProof(proofHash);
    return BigInt(bigNumber.toString());
  } catch (e) {
    debug('approveProof gas estimate failed:', e);
    // Probably not enough balance.
    return 55000n;
  }
}

function costPlus10Percent(gas?: bigint, gasUnitPrice?: bigint) {
  if (gas === undefined || gasUnitPrice === undefined) return undefined;
  return (gas * gasUnitPrice * 110n) / 100n;
}

const POLL_INTERVAL = 1000 * 60 * 10;

export function useEstimatedShieldingGasCosts(depositor: EthAddress | undefined, assetId: number | undefined) {
  const stableEthereumProvider = useStableEthereumProvider();
  const gasUnitPrice = useGasUnitPrice();
  const rpStatus = useRollupProviderStatus();
  const contractAddress = rpStatus?.blockchainStatus.rollupContractAddress.toString();
  const contract = useMemo(() => {
    return new Contract(contractAddress, ROLLUP_ABI, stableEthereumProvider);
  }, [stableEthereumProvider, contractAddress]);
  const pollApproveProofGas = useCallback(() => getApproveProofGasEstimate(contract), [contract]);
  const approveProofGas = usePolledCallback(pollApproveProofGas, POLL_INTERVAL);
  const fromAddressStr = depositor?.toString();
  const pollDepositFundsGas = useMemo(() => {
    if (!fromAddressStr || assetId === undefined) return;
    return () => getDepositFundsGasEstimate(contract, fromAddressStr, assetId);
  }, [contract, fromAddressStr, assetId]);
  const depositFundsGas = usePolledCallback(pollDepositFundsGas, POLL_INTERVAL);

  return {
    depositFundsGasCost: costPlus10Percent(depositFundsGas, gasUnitPrice),
    approveProofGasCost: costPlus10Percent(approveProofGas, gasUnitPrice),
  };
}
