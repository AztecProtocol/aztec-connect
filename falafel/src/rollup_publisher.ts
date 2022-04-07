import { Blockchain, EthereumRpc, TxHash } from '@aztec/barretenberg/blockchain';
import { JoinSplitProofData } from '@aztec/barretenberg/client_proofs';
import { RollupDao } from './entity';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';

export class RollupPublisher {
  private interrupted = false;
  private interruptPromise = Promise.resolve();
  private interruptResolve = () => {};
  private ethereumRpc: EthereumRpc;

  constructor(
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    private maxProviderGasPrice: bigint,
    private gasLimit: number,
    private metrics: Metrics,
  ) {
    this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));
    this.ethereumRpc = new EthereumRpc(blockchain.getProvider());
  }

  public async publishRollup(rollup: RollupDao) {
    const txData = await this.createTxData(rollup);
    await this.rollupDb.setCallData(rollup.id, txData.broadcastDataTx, txData.rollupProofTx);
    console.log(`Publishing rollup: ${rollup.id}`);

    while (!this.interrupted) {
      // Wait until fee is below threshold.
      if (this.maxProviderGasPrice) {
        const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } = await this.blockchain.getFeeData();
        const fee = gasPrice ? gasPrice : maxFeePerGas + maxPriorityFeePerGas;
        if (fee > this.maxProviderGasPrice) {
          console.log(`Gas price too high at ${fee} wei. Waiting till below ${this.maxProviderGasPrice}...`);
          await this.sleepOrInterrupted(60000);
          continue;
        }
      }

      const end = this.metrics.publishTimer();

      // TODO: We need to ensure a rollup provider always publishes the broadcast data, otherwise they could just
      // publish the rollup proof, and get all the fees, but without the broadcast data no clients are actually
      // able to find their txs. This is acceptable for now because we're the only provider.
      // WARNING: If you restart the server at the wrong time (in-between sending broadcast data and rollup proof),
      // you will pay twice for broadcast data.
      //
      // We are just using the default (0) account on the Blockchain provider to send txs.
      const [defaultSigningAddress] = await this.ethereumRpc.getAccounts();
      const nonce = await this.ethereumRpc.getTransactionCount(defaultSigningAddress);
      // First send the broadcast data.
      await this.sendTx(txData.broadcastDataTx, nonce);
      // Then send the actual rollup proof.
      const txHash = await this.sendTx(txData.rollupProofTx, nonce + 1);
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

      const { nextRollupId } = this.blockchain.getBlockchainStatus();
      if (nextRollupId > rollup.id) {
        console.log('Publish failed. Contract changed underfoot.');
        break;
      }

      console.log(`Transaction status failed: ${txHash}`);
      if (receipt.revertError) {
        console.log(`Revert Error: ${receipt.revertError.name}(${receipt.revertError.params.join(', ')})`);
      }
      await this.sleepOrInterrupted(60000);
    }

    console.log('Publish rollup interrupted.');
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
    const txData = await this.blockchain.createRollupTxs(proof, signatures, offchainTxData);
    console.log(`Rollup proof size: ${txData.rollupProofTx.length} bytes`);
    console.log(`Offchain size: ${txData.broadcastDataTx.length} bytes`);
    return txData;
  }

  private async sendTx(txData: Buffer, nonce: number) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.sendTx(txData, { gasLimit: this.gasLimit, nonce });
      } catch (err: any) {
        console.log(err.message.slice(0, 500));
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
