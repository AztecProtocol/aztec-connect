import { Web3Provider } from '@ethersproject/providers';
import { EthAddress } from 'barretenberg/address';
import { RollupProofData } from 'barretenberg/rollup_proof';
import { TxHash } from 'barretenberg/rollup_provider';
import { toBufferBE } from 'bigint-buffer';
import { Blockchain, EthereumProvider } from 'blockchain';
import { utils } from 'ethers';
import moment, { Duration } from 'moment';
import { RollupDao } from './entity/rollup';
import { Metrics } from './metrics';
import { RollupDb } from './rollup_db';

interface PublishItem {
  rollupId: number;
  proof: Buffer;
  signatures: Buffer[];
  viewingKeys: Buffer[];
}

export class RollupPublisher {
  private interrupted = false;
  private interruptPromise = Promise.resolve();
  private interruptResolve = () => {};
  private provider: Web3Provider;

  constructor(
    private rollupDb: RollupDb,
    private blockchain: Blockchain,
    private publishInterval: Duration,
    private feeLimit: bigint,
    provider: EthereumProvider,
    private metrics: Metrics,
  ) {
    this.provider = new Web3Provider(provider);
  }

  public async publishRollup(rollup: RollupDao) {
    const lastPublished = await this.rollupDb.getSettledRollups(0, true, 1);

    if (lastPublished.length) {
      const lastPublishedAt = lastPublished[0].created;
      const sincePublished = moment().diff(lastPublishedAt, 's');
      if (sincePublished < this.publishInterval.seconds()) {
        const sleepFor = this.publishInterval.seconds() - sincePublished;
        console.log(`Rollup due to be published in ${sleepFor} seconds...`);
        await this.sleepOrInterrupted(sleepFor * 1000);
      }
    }

    while (!this.interrupted) {
      this.interruptPromise = new Promise(resolve => (this.interruptResolve = resolve));

      const proof = rollup.rollupProof.proofData;
      const rollupId = rollup.id;
      const txs = rollup.rollupProof.txs;
      const viewingKeys = txs.map(tx => [tx.viewingKey1, tx.viewingKey2]).flat();
      const signatures = txs.map(tx => tx.signature!).filter(s => !!s);

      const item = {
        rollupId,
        proof,
        viewingKeys,
        signatures,
      };

      const end = this.metrics.publishTimer();
      const txHash = await this.sendRollupProof(item);
      if (!txHash) {
        break;
      }
      end();

      await this.rollupDb.confirmSent(rollupId, txHash);

      const receipt = await this.getTransactionReceipt(txHash);
      if (!receipt) {
        break;
      }

      if (receipt.status) {
        return true;
      }

      const { nextRollupId } = await this.blockchain.getStatus();
      if (nextRollupId > item.rollupId) {
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

  public clearInterrupt() {
    this.interrupted = false;
  }

  private async generateSignature(
    rollupProof: Buffer,
    feeReceiver: EthAddress,
    feeLimit: bigint,
    feeDistributorAddress: EthAddress,
  ) {
    const signer = this.provider.getSigner();
    const publicInputs = rollupProof.slice(0, RollupProofData.LENGTH_ROLLUP_PUBLIC);
    const msgHash = utils.solidityKeccak256(
      ['bytes'],
      [
        Buffer.concat([
          publicInputs,
          feeReceiver.toBuffer(),
          toBufferBE(feeLimit, 32),
          feeDistributorAddress.toBuffer(),
        ]),
      ],
    );
    const digest = utils.arrayify(msgHash);
    const signature = await signer.signMessage(digest);
    let signatureBuf = Buffer.from(signature.slice(2), 'hex');
    const v = signatureBuf[signatureBuf.length - 1];
    if (v <= 1) {
      signatureBuf = Buffer.concat([signatureBuf.slice(0, -1), Buffer.from([v + 27])]);
    }

    return signatureBuf;
  }

  private async sendRollupProof(item: PublishItem) {
    const { proof, signatures, viewingKeys } = item;
    const signer = this.provider.getSigner();
    const signingAddress = EthAddress.fromString(await signer.getAddress());
    const feeReceiver = signingAddress;
    const feeDistributorAddress = this.blockchain.getFeeDistributorContractAddress();
    const providerSignature = await this.generateSignature(proof, feeReceiver, this.feeLimit, feeDistributorAddress);

    while (!this.interrupted) {
      try {
        return await this.blockchain.sendRollupProof(
          proof,
          signatures,
          viewingKeys,
          providerSignature,
          feeReceiver,
          this.feeLimit,
          signingAddress,
        );
      } catch (err) {
        console.log(err.message.slice(0, 200));
        await this.sleepOrInterrupted(60000);
      }
    }
  }

  private async getTransactionReceipt(txHash: TxHash) {
    while (!this.interrupted) {
      try {
        return await this.blockchain.getTransactionReceipt(txHash);
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
