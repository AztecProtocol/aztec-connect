/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable require-await */
/* eslint-disable camelcase */
import { BridgeCallData } from '@aztec/barretenberg/bridge_call_data';
import { AssetValue } from '@aztec/barretenberg/asset';
import { EthereumProvider } from '@aztec/barretenberg/blockchain';
import { EthAddress } from '@aztec/barretenberg/address';
import { createWeb3Provider } from './web3_provider.js';
import { AuxDataConfig, AztecAsset, BridgeDataFieldGetters, SolidityType } from './bridge-data.js';
import { ElementBridge, RollupProcessor, IVault } from '../abis/index.js';
import { Contract, BigNumber } from 'ethers';
import { fetch } from '@aztec/barretenberg/iso_fetch';

export type BatchSwapStep = {
  poolId: string;
  assetInIndex: number;
  assetOutIndex: number;
  amount: string;
  userData: string;
};

export enum SwapType {
  SwapExactIn,
  SwapExactOut,
}

export type FundManagement = {
  sender: string;
  recipient: string;
  fromInternalBalance: boolean;
  toInternalBalance: boolean;
};

interface EventBlock {
  nonce: number;
  blockNumber: number;
  encodedBridgeCallData: bigint;
  totalInputValue: bigint;
  timestamp: number;
}

function divide(a: bigint, b: bigint, precision: bigint) {
  return (a * precision) / b;
}

const decodeEvent = async (event: any): Promise<EventBlock> => {
  const {
    args: [encodedBridgeCallData, nonce, totalInputValue],
  } = event;
  const block = await event.getBlock();
  const newEventBlock = {
    nonce: nonce.toNumber(),
    blockNumber: block.number,
    encodedBridgeCallData: encodedBridgeCallData.toBigInt(),
    totalInputValue: totalInputValue.toBigInt(),
    timestamp: block.timestamp,
  };
  return newEventBlock;
};

export class ElementBridgeData implements BridgeDataFieldGetters {
  public scalingFactor = BigInt(1n * 10n ** 18n);
  private interactionBlockNumbers: Array<EventBlock> = [];

  private constructor(
    private elementBridgeContract: Contract,
    private balancerContract: Contract,
    private rollupContract: Contract,
    private falafelEndpoint: string,
  ) {}

  static create(
    provider: EthereumProvider,
    elementBridgeAddress: EthAddress,
    balancerAddress: EthAddress,
    rollupContractAddress: EthAddress,
    falafelEndpoint: string,
  ) {
    const ethersProvider = createWeb3Provider(provider);
    const elementBridgeContract = new Contract(elementBridgeAddress.toString(), ElementBridge.abi, ethersProvider);
    const rollupContract = new Contract(rollupContractAddress.toString(), RollupProcessor.abi, ethersProvider);
    const vaultContract = new Contract(balancerAddress.toString(), IVault.abi, ethersProvider);
    return new ElementBridgeData(elementBridgeContract, vaultContract, rollupContract, falafelEndpoint);
  }

  private async storeEventBlocks(events: any[]) {
    if (!events.length) {
      return;
    }
    const storeBlock = async (event: any) => {
      const newEventBlock = await decodeEvent(event);
      for (let i = 0; i < this.interactionBlockNumbers.length; i++) {
        const currentBlock = this.interactionBlockNumbers[i];
        if (currentBlock.nonce === newEventBlock.nonce) {
          return;
        }
        if (currentBlock.nonce > newEventBlock.nonce) {
          this.interactionBlockNumbers.splice(i, 0, newEventBlock);
          return;
        }
      }
      this.interactionBlockNumbers.push(newEventBlock);
    };
    // store the first event and the last (if there are more than one)
    await storeBlock(events[0]);
    if (events.length > 1) {
      await storeBlock(events[events.length - 1]);
    }
  }

  private async getCurrentBlock() {
    return this.elementBridgeContract.provider.getBlock('latest');
  }

  private async getBlockNumber(interactionNonce: number) {
    const id = Math.floor(Number(interactionNonce) / 32);

    const response = await fetch(`${this.falafelEndpoint}/rollup/${id}`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'GET',
    });

    const data = await response.json();
    const tx = await this.elementBridgeContract.provider.getTransactionReceipt(data['ethTxHash']);
    return tx.blockNumber;
  }

  private async findDefiEventForNonce(interactionNonce: number) {
    // start off with the earliest possible block being the block in which the tranche was first deployed
    // try and find previously stored events that encompass the nonce we are looking for
    // also if we find the exact nonce then just return the stored data
    for (let i = 0; i < this.interactionBlockNumbers.length; i++) {
      const storedBlock = this.interactionBlockNumbers[i];
      if (storedBlock.nonce === interactionNonce) {
        return storedBlock;
      }
    }

    const start = await this.getBlockNumber(interactionNonce);
    const end = start + 1;

    const events = await this.rollupContract.queryFilter(
      this.rollupContract.filters.AsyncDefiBridgeProcessed(undefined, interactionNonce),
      start,
      end,
    );
    // capture these event markers
    await this.storeEventBlocks(events);
    // there should just be one event, the one we are searching for. but to be sure we will process everything received
    for (const event of events) {
      const newEventBlock = await decodeEvent(event);
      if (newEventBlock.nonce === interactionNonce) {
        return newEventBlock;
      }
    }
  }

  // @dev This function should be implemented for stateful bridges. It should return an array of AssetValue's
  // @dev which define how much a given interaction is worth in terms of Aztec asset ids.
  // @param bigint interactionNonce the interaction nonce to return the value for
  async getInteractionPresentValue(interactionNonce: number, inputValue: bigint): Promise<AssetValue[]> {
    const interaction = await this.elementBridgeContract.interactions(interactionNonce);
    if (interaction === undefined) {
      return [];
    }
    const exitTimestamp = interaction.expiry;
    const endValue = interaction.quantityPT;

    // we get the present value of the interaction
    const defiEvent = await this.findDefiEventForNonce(interactionNonce);
    if (defiEvent === undefined) {
      return [];
    }

    const latestBlock = await this.getCurrentBlock();

    const now = latestBlock.timestamp;
    const totalInterest = endValue.toBigInt() - defiEvent.totalInputValue;
    const elapsedTime = BigInt(now - defiEvent.timestamp);
    const totalTime = exitTimestamp.toBigInt() - BigInt(defiEvent.timestamp);
    const accruedInterest = (totalInterest * elapsedTime) / totalTime;
    const totalPresentValue = defiEvent.totalInputValue + accruedInterest;
    const userPresentValue = (totalPresentValue * inputValue) / defiEvent.totalInputValue;
    return [
      {
        assetId: BridgeCallData.fromBigInt(defiEvent.encodedBridgeCallData).inputAssetIdA,
        value: userPresentValue,
      },
    ];
  }

  async getInteractionAPR(interactionNonce: number): Promise<number[]> {
    const interaction = await this.elementBridgeContract.interactions(interactionNonce);
    if (interaction === undefined) {
      return [];
    }
    const exitTimestamp = interaction.expiry;
    const endValue = interaction.quantityPT;

    // we get the present value of the interaction
    const defiEvent = await this.findDefiEventForNonce(interactionNonce);
    if (defiEvent === undefined) {
      return [];
    }

    const YEAR = 60n * 60n * 24n * 365n;

    const totalInterest = endValue.toBigInt() - defiEvent.totalInputValue;
    const totalTime = exitTimestamp.toBigInt() - BigInt(defiEvent.timestamp);
    const interestPerSecondScaled = divide(totalInterest, totalTime, this.scalingFactor);
    const yearlyInterest = (interestPerSecondScaled * YEAR) / this.scalingFactor;

    const percentageScaled = divide(yearlyInterest, defiEvent.totalInputValue, this.scalingFactor);
    const percentage2sf = (percentageScaled * 10000n) / this.scalingFactor;
    return [Number(percentage2sf) / 100];
  }

  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    const assetExpiries: BigNumber[] = await this.elementBridgeContract.getAssetExpiries(
      inputAssetA.erc20Address.toString(),
    );
    if (assetExpiries && assetExpiries.length) {
      return assetExpiries.map(a => a.toBigInt());
    }
    return [];
  }

  public auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'Unix Timestamp of the tranch expiry',
    },
  ];

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    inputValue: bigint,
  ): Promise<bigint[]> {
    // bridge is async the third parameter represents this
    return [BigInt(0), BigInt(0), BigInt(1)];
  }

  async getTermAPR(underlying: AztecAsset, auxData: bigint, inputValue: bigint): Promise<number> {
    const assetExpiryHash = await this.elementBridgeContract.hashAssetAndExpiry(
      underlying.erc20Address.toString(),
      auxData,
    );
    const pool = await this.elementBridgeContract.pools(assetExpiryHash);
    const poolId = pool.poolId;
    const trancheAddress = pool.trancheAddress;

    const funds: FundManagement = {
      sender: EthAddress.ZERO.toString(),
      recipient: EthAddress.ZERO.toString(),
      fromInternalBalance: false,
      toInternalBalance: false,
    };

    const step: BatchSwapStep = {
      poolId,
      assetInIndex: 0,
      assetOutIndex: 1,
      amount: inputValue.toString(),
      userData: '0x',
    };

    const deltas = await this.balancerContract.queryBatchSwap(
      SwapType.SwapExactIn,
      [step],
      [underlying.erc20Address.toString(), trancheAddress],
      funds,
    );

    const latestBlock = await this.getCurrentBlock();

    const outputAssetAValue: BigNumber = deltas[1];

    const timeToExpiration = auxData - BigInt(latestBlock.timestamp);

    const YEAR = 60n * 60n * 24n * 365n;
    const interest = -outputAssetAValue.toBigInt() - inputValue;
    const scaledOutput = divide(interest, timeToExpiration, this.scalingFactor);
    const yearlyOutput = (scaledOutput * YEAR) / this.scalingFactor;
    const percentageScaled = divide(yearlyOutput, inputValue, this.scalingFactor);
    const percentage2sf = (percentageScaled * 10000n) / this.scalingFactor;
    return Number(percentage2sf) / 100;
  }

  async getExpiration(interactionNonce: number): Promise<bigint> {
    const interaction = await this.elementBridgeContract.interactions(interactionNonce);
    return BigInt(interaction.expiry.toString());
  }

  async hasFinalised(interactionNonce: number): Promise<boolean> {
    const interaction = await this.elementBridgeContract.interactions(interactionNonce);
    return interaction.finalised;
  }
}
