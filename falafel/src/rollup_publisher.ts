import { EthAddress } from '@aztec/barretenberg/address';
import { AssetId } from '@aztec/barretenberg/asset';
import { toBufferBE } from '@aztec/barretenberg/bigint_buffer';
import { Blockchain, EthereumProvider } from '@aztec/barretenberg/blockchain';
import { JoinSplitProofData } from '@aztec/barretenberg/client_proofs';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Web3Signer } from '@aztec/blockchain';
import { Keccak } from 'sha3';
import { RollupDao } from './entity/rollup';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';

export class RollupPublisher {
  private interrupted = false;
  private interruptPromise = Promise.resolve();
  private interruptResolve = () => {};

  constructor(
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    private feeLimit: bigint,
    private maxProviderGasPrice: bigint,
    private providerGasPriceMultiplier: number,
    private provider: EthereumProvider,
    private providerAddress: EthAddress,
    private metrics: Metrics,
  ) {
    this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));
  }

  public async publishRollup(rollup: RollupDao) {
    const txData = await this.createTxData(rollup);
    await this.rollupDb.setCallData(rollup.id, txData);

    while (!this.interrupted) {
      // Check fee distributor has at least 0.5 ETH.
      const { feeDistributorBalance } = await this.blockchain.getBlockchainStatus();
      if (feeDistributorBalance[AssetId.ETH] < 5n * 10n ** 17n) {
        console.log(`Fee distributor ETH balance too low, awaiting top up...`);
        await this.sleepOrInterrupted(60000);
        continue;
      }

      const end = this.metrics.publishTimer();
      const txHash = await this.sendRollupProof(txData);
      if (!txHash) {
        break;
      }

      await this.rollupDb.confirmSent(rollup.id, txHash);

      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt) {
        break;
      }

      if (receipt.status) {
        end();
        return true;
      }

      const { nextRollupId } = await this.blockchain.getBlockchainStatus();
      if (nextRollupId > rollup.id) {
        console.log('Publish failed. Contract changed underfoot.');
        break;
      }

      console.log(`Transaction status failed: ${txHash}`);
      await this.sleepOrInterrupted(60000);
    }

    return false;
  }

  /**
   * Calling `interrupt` will cause any in progress call to `publishRollup` to return `false` asap.
   * Be warned, the call may return false even if the tx subsequently gets successfully mined.
   * In practice this shouldn't matter, as we'll only ever be calling `interrupt` when we know it's going to fail.
   * A call to `clearInterrupt` is required before you can continue publishing.
   */
  public interrupt() {
    this.interrupted = true;
    this.interruptResolve();
  }

  private async createTxData(rollup: RollupDao) {
    const proof = rollup.rollupProof.proofData;
    const txs = rollup.rollupProof.txs;
    const offchainTxData = txs.map(tx => tx.offchainTxData);
    const jsTxs = txs.filter(tx => tx.signature);
    const signatures: Buffer[] = [];
    for (const tx of jsTxs) {
      const { publicOwner, txId } = JoinSplitProofData.fromBuffer(tx.proofData);
      const proofApproval = await this.blockchain.getUserProofApprovalStatus(publicOwner, txId);
      if (!proofApproval) {
        signatures.push(tx.signature!);
      }
    }

    const { feeDistributorContractAddress } = await this.blockchain.getBlockchainStatus();
    const providerSignature = await this.generateSignature(
      proof,
      this.providerAddress,
      this.feeLimit,
      feeDistributorContractAddress,
    );

    return await this.blockchain.createRollupProofTx(
      proof,
      signatures,
      offchainTxData,
      providerSignature,
      this.providerAddress,
      this.providerAddress,
      this.feeLimit,
    );
  }

  private async generateSignature(
    rollupProof: Buffer,
    feeReceiver: EthAddress,
    feeLimit: bigint,
    feeDistributorAddress: EthAddress,
  ) {
    const publicInputs = rollupProof.slice(0, RollupProofData.LENGTH_ROLLUP_HEADER_INPUTS);
    const message = Buffer.concat([
      publicInputs,
      feeReceiver.toBuffer(),
      toBufferBE(feeLimit, 32),
      feeDistributorAddress.toBuffer(),
    ]);
    const digest = new Keccak(256).update(message).digest();
    return await new Web3Signer(this.provider).signMessage(digest, this.providerAddress);
  }

  private async sendRollupProof(txData: Buffer) {
    while (!this.interrupted) {
      try {
        const multiplier = BigInt(Math.floor(this.providerGasPriceMultiplier * 100));
        const reportedPrice = ((await this.blockchain.getGasPrice()) * multiplier) / 100n;
        const gasPrice = reportedPrice < this.maxProviderGasPrice ? reportedPrice : this.maxProviderGasPrice;
        return await this.blockchain.sendTx(txData, { gasPrice });
      } catch (err) {
        console.log(err.message.slice(0, 200));
        await this.sleepOrInterrupted(60000);
      }
    }
  }

  private async getTransactionReceipt(txHash: TxHash) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.getTransactionReceiptSafe(txHash);
      } catch (err) {
        console.log(err);
        await this.sleepOrInterrupted(60000);
      }
    }
  }

  private async sleepOrInterrupted(ms: number) {
    await Promise.race([new Promise(resolve => setTimeout(resolve, ms)), this.interruptPromise]);
  }
}
