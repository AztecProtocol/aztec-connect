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

  private async awaitFeeBelowThreshold() {
    // Wait until fee is below threshold.
    while (!this.interrupted && this.maxProviderGasPrice) {
      const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } = await this.blockchain.getFeeData();
      const fee = gasPrice ? gasPrice : maxFeePerGas + maxPriorityFeePerGas;
      if (fee <= this.maxProviderGasPrice) {
        break;
      }
      console.log(`Gas price too high at ${fee} wei. Waiting till below ${this.maxProviderGasPrice}...`);
      await this.sleepOrInterrupted(60000);
    }
  }

  public async publishRollup(rollup: RollupDao) {
    const { rollupProofTx, offchainDataTxs } = await this.createTxData(rollup);

    await this.rollupDb.setCallData(rollup.id, rollupProofTx);
    console.log(`Publishing rollup: ${rollup.id}`);

    const endTimer = this.metrics.publishTimer();

    // TODO: We need to ensure a rollup provider always publishes the broadcast data, otherwise they could just
    // publish the rollup proof, and get all the fees, but without the broadcast data no clients are actually
    // able to find their txs. This is acceptable for now because we're the only provider.
    // WARNING: If you restart the server at the wrong time (in-between sending broadcast data and rollup proof),
    // you will pay twice for broadcast data.

    type OcdStatus = { success: boolean; txHash?: TxHash; tx: Buffer };
    const ocdStatus: OcdStatus[] = offchainDataTxs.map(tx => ({ success: false, tx }));
    const [defaultSigner] = await this.ethereumRpc.getAccounts();

    while (!this.interrupted) {
      await this.awaitFeeBelowThreshold();

      let nonce = await this.ethereumRpc.getTransactionCount(defaultSigner);

      // First send the broadcast data (if we haven't already successfully).
      for (let i = 0; i < ocdStatus.length; i++) {
        const { tx, success } = ocdStatus[i];
        if (success) {
          continue;
        }
        console.log(`Sending broadcast data ${i}/${ocdStatus.length} of size ${tx.length} with nonce ${nonce}...`);
        ocdStatus[i].txHash = await this.sendTx(tx, nonce++);
      }
      // If interrupted, one of more txHash will be undefined.
      if (ocdStatus.some(s => s.txHash === undefined)) break;

      // Then send the actual rollup proof.
      console.log(`Sending rollup proof of size ${rollupProofTx.length} with nonce ${nonce}...`);
      const rpTxHash = await this.sendTx(rollupProofTx, nonce++);
      if (!rpTxHash) break;

      // All txs have been sent.
      await this.rollupDb.confirmSent(rollup.id, rpTxHash);

      // Check receipts for offchain data.
      for (let i = 0; i < ocdStatus.length; i++) {
        const { txHash, success } = ocdStatus[i];
        if (success) {
          continue;
        }
        const receipt = await this.getTransactionReceipt(txHash!);
        if (!receipt) return false;
        if (receipt.status) {
          ocdStatus[i].success = true;
        } else {
          console.log(`Offchain data transaction failed: ${txHash!.toString()}`);
          if (receipt.revertError) {
            console.log(`Revert Error: ${receipt.revertError.name}(${receipt.revertError.params.join(', ')})`);
          }
          await this.sleepOrInterrupted(60000);
          continue;
        }
      }

      // Check receipt for process rollup tx.
      const receipt = await this.getTransactionReceipt(rpTxHash);
      if (!receipt) break;

      if (receipt.status) {
        endTimer();
        return true;
      }

      console.log(`Process rollup transaction failed: ${rpTxHash}`);
      if (receipt.revertError) {
        console.log(`Revert Error: ${receipt.revertError.name}(${receipt.revertError.params.join(', ')})`);
        if (receipt.revertError.name === 'INCORRECT_STATE_HASH') {
          console.log('Publish failed. Contract state changed underfoot.');
          return false;
        }
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
    return await this.blockchain.createRollupTxs(proof, signatures, offchainTxData);
  }

  private async sendTx(txData: Buffer, nonce?: number) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.sendTx(txData, { gasLimit: this.gasLimit, nonce });
      } catch (err: any) {
        console.log(err.message.slice(0, 500));
        console.log('Will retry in 60s...');
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
