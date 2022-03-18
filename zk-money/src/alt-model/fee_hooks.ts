import createDebug from 'debug';
import { useEffect, useMemo, useState } from 'react';
import { AssetValue, EthAddress, TxSettlementTime } from '@aztec/sdk';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { useInitialisedSdk, useStableEthereumProvider } from 'alt-model/top_level_context';
import { listenPoll } from 'app/util';
import { useRollupProviderStatus } from './rollup_provider_hooks';

const debug = createDebug('zm:fee_hooks');

const ROLLUP_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'assetId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'depositorAddress',
        type: 'address',
      },
    ],
    name: 'depositPendingFunds',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  'function approveProof(bytes32 _proofHash)',
];

async function getDepositFundsGasEstimate(contract: Contract, fromAddressStr: string, assetId: number) {
  try {
    // A non-zero value indicates some token is has to be transfered
    const value = assetId === 0 ? 0n : 1n;
    const gas = await contract.estimateGas.depositPendingFunds(assetId, 1n, fromAddressStr, { value });
    return BigInt(gas.toString());
  } catch (e) {
    debug(e);
    // Probably not enough balance.
    return 70000n;
  }
}

async function getApproveProofGasEstimate(contract: Contract) {
  const proofHash = '0x'.padEnd(66, '0');
  try {
    const bigNumber = await contract.estimateGas.approveProof(proofHash);
    return BigInt(bigNumber.toString());
  } catch (e) {
    debug(e);
    // Probably not enough balance.
    return 50000n;
  }
}

const GAS_PRICE_POLL_INTERVAL = 1000 * 60;

function useGasPrice() {
  const stableEthereumProvider = useStableEthereumProvider();
  const [price, setPrice] = useState<bigint>();
  useEffect(() => {
    const web3Provider = new Web3Provider(stableEthereumProvider);
    return listenPoll(async () => {
      const bigNumber = await web3Provider.getGasPrice();
      setPrice(BigInt(bigNumber.toString()));
    }, GAS_PRICE_POLL_INTERVAL);
  }, [stableEthereumProvider]);
  return price;
}

function costPlus10Percent(gas?: bigint, gasPrice?: bigint) {
  if (gas === undefined || gasPrice === undefined) return undefined;
  return (gas * gasPrice * 110n) / 100n;
}

export function useEstimatedShieldingGasCosts(depositor?: EthAddress, assetId?: number) {
  const stableEthereumProvider = useStableEthereumProvider();
  const gasPrice = useGasPrice();
  const rpStatus = useRollupProviderStatus();
  const contractAddress = rpStatus?.blockchainStatus.feeDistributorContractAddress.toString();
  const [depositFundsGas, setDepositFundsGas] = useState<bigint>();
  const [approveProofGas, setApproveProofGas] = useState<bigint>();
  const contract = useMemo(() => {
    if (contractAddress) {
      const web3Provider = new Web3Provider(stableEthereumProvider);
      return new Contract(contractAddress, ROLLUP_ABI, web3Provider.getSigner());
    }
  }, [stableEthereumProvider, contractAddress]);
  useEffect(() => {
    if (contract) getApproveProofGasEstimate(contract).then(setApproveProofGas);
  }, [contract]);
  const fromAddressStr = depositor?.toString();
  useEffect(() => {
    if (contract && fromAddressStr && assetId !== undefined) {
      getDepositFundsGasEstimate(contract, fromAddressStr, assetId).then(setDepositFundsGas);
    }
  }, [contract, fromAddressStr, assetId]);

  return {
    depositFundsGasCost: costPlus10Percent(depositFundsGas, gasPrice),
    approveProofGasCost: costPlus10Percent(approveProofGas, gasPrice),
  };
}

const DEPOSIT_FEE_POLL_INTERVAL = 1000 * 60 * 5;

export function useDepositFee(assetId: number, speed: TxSettlementTime) {
  const sdk = useInitialisedSdk();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    if (sdk) {
      return listenPoll(() => sdk.getDepositFees(assetId).then(setFees), DEPOSIT_FEE_POLL_INTERVAL);
    }
  }, [sdk, assetId]);
  return fees?.[speed];
}
