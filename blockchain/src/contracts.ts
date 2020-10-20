import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { Contract, ethers, Signer } from 'ethers';
import { abi as RollupABI } from './artifacts/RollupProcessor.json';
import { abi as ERC20ABI } from './artifacts/ERC20Mintable.json';
import { abi as ERC20PermitABI } from './artifacts/ERC20Permit.json';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { Block } from './blockchain';

export type EthereumSignature = { v: Buffer; r: Buffer; s: Buffer };
export type PermitArgs = { deadline: bigint; approvalAmount: bigint; signature: EthereumSignature };

export class Contracts {
  private rollupProcessor: Contract;
  private erc20Contracts: Contract[] = [];

  constructor(private rollupContractAddress: EthAddress, private provider: Provider, private signer?: Signer) {
    this.rollupProcessor = new ethers.Contract(rollupContractAddress.toString(), RollupABI, signer || provider);
  }

  public async init() {
    const assetAddresses = await this.rollupProcessor.getSupportedAssets();

    this.erc20Contracts = await Promise.all(
      assetAddresses.map(async (a: any, index: number) => {
        const assetPermitSupport = await this.rollupProcessor.getAssetPermitSupport(index);
        const newContractABI = assetPermitSupport ? ERC20PermitABI : ERC20ABI;
        return new ethers.Contract(a, newContractABI, this.signer);
      }),
    );
  }

  public async getSupportedAssets(): Promise<EthAddress[]> {
    const assetAddresses = await this.rollupProcessor.getSupportedAssets();
    return assetAddresses.map((a: string) => EthAddress.fromString(a));
  }

  public async setSupportedAsset(assetAddress: EthAddress, supportsPermit: boolean) {
    const tx = await this.rollupProcessor.setSupportedAsset(assetAddress.toString(), supportsPermit);
    const newContractABI = supportsPermit ? ERC20PermitABI : ERC20ABI;
    this.erc20Contracts.push(new ethers.Contract(assetAddress.toString(), newContractABI, this.signer));
    return Buffer.from(tx.hash.slice(2), 'hex');
  }

  public async getNetwork() {
    return await this.provider!.getNetwork();
  }

  public async getRollupStatus() {
    const nextRollupId = +(await this.rollupProcessor.nextRollupId());
    const dataSize = +(await this.rollupProcessor.dataSize());
    const dataRoot = Buffer.from((await this.rollupProcessor.dataRoot()).slice(2), 'hex');
    const nullRoot = Buffer.from((await this.rollupProcessor.nullRoot()).slice(2), 'hex');
    const rootRoot = Buffer.from((await this.rollupProcessor.rootRoot()).slice(2), 'hex');

    return {
      nextRollupId,
      dataRoot,
      nullRoot,
      rootRoot,
      dataSize,
    };
  }

  public async getEscapeHatchStatus() {
    const [escapeOpen, blocksRemaining] = await this.rollupProcessor.getEscapeHatchStatus();
    const numEscapeBlocksRemaining = blocksRemaining.toNumber();
    return {
      escapeOpen,
      numEscapeBlocksRemaining,
    };
  }

  public getRollupContractAddress() {
    return this.rollupContractAddress;
  }

  public getTokenContractAddresses() {
    return this.erc20Contracts.map(c => EthAddress.fromString(c.address));
  }

  /**
   * Send a proof to the rollup processor, which processes the proof and passes it to the verifier to
   * be verified.
   *
   * Appends viewingKeys to the proofData, so that they can later be fetched from the tx calldata
   * and added to the emitted rollupBlock.
   */
  public async sendRollupProof(
    proofData: Buffer,
    signatures: Buffer[],
    sigIndexes: number[],
    viewingKeys: Buffer[],
    gasLimit?: number,
  ) {
    const formattedSignatures = this.solidityFormatSignatures(signatures);
    const tx = await this.rollupProcessor.processRollup(
      `0x${proofData.toString('hex')}`,
      formattedSignatures,
      sigIndexes,
      Buffer.concat(viewingKeys),
      { gasLimit },
    );
    return Buffer.from(tx.hash.slice(2), 'hex');
  }

  public async depositPendingFunds(
    assetId: number,
    amount: bigint,
    depositorAddress: EthAddress,
    permitArgs?: PermitArgs,
  ) {
    const tx = permitArgs
      ? await this.rollupProcessor.depositPendingFundsPermit(
          assetId,
          amount,
          depositorAddress.toString(),
          this.rollupProcessor.address,
          permitArgs.approvalAmount,
          permitArgs.deadline,
          permitArgs.signature.v,
          permitArgs.signature.r,
          permitArgs.signature.s,
        )
      : await this.rollupProcessor.depositPendingFunds(assetId, amount, depositorAddress.toString());
    return Buffer.from(tx.hash.slice(2), 'hex');
  }

  public async getRollupBlocksFrom(rollupId: number, minConfirmations: number) {
    const rollupFilter = this.rollupProcessor.filters.RollupProcessed(rollupId);
    const [rollupEvent] = await this.rollupProcessor.queryFilter(rollupFilter);
    if (!rollupEvent) {
      return [];
    }
    const filter = this.rollupProcessor.filters.RollupProcessed();
    const rollupEvents = await this.rollupProcessor.queryFilter(filter, rollupEvent.blockNumber);
    const txs = await Promise.all(rollupEvents.map(event => event.getTransaction()));
    return txs.filter(tx => tx.confirmations >= minConfirmations).map(tx => this.decodeBlock(tx));
  }

  public async getUserPendingDeposit(assetId: number, account: EthAddress): Promise<bigint> {
    return this.rollupProcessor.getUserPendingDeposit(assetId, account.toString());
  }

  /**
   * Format all signatures into useful solidity format. EVM word size is 32bytes
   * and we're supplying a concatenated array of signatures - so need each ECDSA
   * param (v, r, s) to occupy 32 bytes.
   *
   * Zero left padding v by 31 bytes.
   */
  private solidityFormatSignatures(signatures: Buffer[]) {
    const paddedSignatures = signatures.map(currentSignature => {
      const v = currentSignature.slice(-1);
      return Buffer.concat([currentSignature.slice(0, 64), Buffer.alloc(31), v]);
    });
    return Buffer.concat(paddedSignatures);
  }

  public async getAssetBalance(assetId: number, address: EthAddress): Promise<bigint> {
    return BigInt(await this.erc20Contracts[assetId].balanceOf(address.toString()));
  }

  public async getAssetPermitSupport(assetId: number): Promise<boolean> {
    return this.rollupProcessor.getAssetPermitSupport(assetId);
  }

  public async getUserNonce(assetId: number, address: EthAddress): Promise<bigint> {
    const tokenPermitContract = this.erc20Contracts[assetId];
    return BigInt(await tokenPermitContract.nonces(address.toString()));
  }

  public async getAssetAllowance(assetId: number, address: EthAddress): Promise<bigint> {
    return BigInt(
      await this.erc20Contracts[assetId].allowance(address.toString(), this.rollupContractAddress.toString()),
    );
  }

  private decodeBlock(tx: TransactionResponse): Block {
    const rollupAbi = new ethers.utils.Interface(RollupABI);
    const result = rollupAbi.parseTransaction({ data: tx.data });
    const rollupProofData = Buffer.from(result.args.proofData.slice(2), 'hex');
    const viewingKeysData = Buffer.from(result.args.viewingKeys.slice(2), 'hex');

    return {
      created: new Date(tx.timestamp! * 1000),
      txHash: Buffer.from(tx.hash.slice(2), 'hex'),
      rollupProofData,
      viewingKeysData,
      rollupId: RollupProofData.getRollupIdFromBuffer(rollupProofData),
      rollupSize: RollupProofData.getRollupSizeFromBuffer(rollupProofData),
    };
  }
}
