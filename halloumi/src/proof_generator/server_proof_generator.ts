import { fetch } from 'barretenberg/iso_fetch';
import { ProofGenerator } from './proof_generator';

export class ServerProofGenerator implements ProofGenerator {
  constructor(private baseUrl: string) {}

  public async awaitReady() {
    while (true) {
      try {
        const url = new URL(this.baseUrl);
        const response = await fetch(url.toString());
        const json = await response.json();
        if (json.isReady) {
          return;
        }
      } catch (err) {
        // Swallow.
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public async reset() {
    const url = new URL(`${this.baseUrl}/reset`);
    await fetch(url.toString());
  }

  private async awaitSucceed(fn: () => Promise<Response>) {
    while (true) {
      try {
        const response = await fn();
        if (response.status !== 200) {
          throw new Error(`Bad status code: ${response.status}`);
        }
        return Buffer.from(await response.arrayBuffer());
      } catch (err) {
        console.log(err);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async getJoinSplitVk() {
    return await this.awaitSucceed(() => fetch(`${this.baseUrl}/get-join-split-vk`));
  }

  public async getAccountVk() {
    return await this.awaitSucceed(() => fetch(`${this.baseUrl}/get-account-vk`));
  }

  // TODO: Probably shouldn't loop here. Instead clients should handle the exception and allow interrupts.
  // For now though, halloumi would eventually come back, proof generated, and client can then handle interrupt.
  public async createProof(data: Buffer) {
    return await this.awaitSucceed(() => fetch(`${this.baseUrl}/create-proof`, { method: 'POST', body: data }));
  }
}
