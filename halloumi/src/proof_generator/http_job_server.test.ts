import { HttpJobServer } from './http_job_server';
import { HttpJobWorker } from './http_job_worker';
import { randomBytes } from 'crypto';
import { Server } from '../server';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('HttpJobServer', () => {
  function createWorker() {
    const server = {
      createProof: jest.fn(),
      getJoinSplitVerificationKey: jest.fn(),
      getAccountVerificationKey: jest.fn(),
    } as Mockify<Server>;

    const expectedProofData = randomBytes(32);
    const expectedVkData = randomBytes(32);
    server.createProof.mockResolvedValue(expectedProofData);
    server.getJoinSplitVerificationKey.mockResolvedValue(expectedVkData);
    const worker = new HttpJobWorker(server as any);

    return { worker, server };
  }

  it('worker should start and stop', async () => {
    const { worker } = createWorker();
    worker.start();
    // Give worker a chance to make request.
    await sleep(100);
    await worker.stop();
  });

  it('simple test', async () => {
    const generator = new HttpJobServer();
    generator.start();

    const { server, worker } = createWorker();
    worker.start();

    const createProofInput = randomBytes(32);
    const proofResult = await generator.createProof(createProofInput);

    expect(server.createProof).toHaveBeenCalledTimes(1);
    expect(proofResult).toEqual(await server.createProof(createProofInput));

    await generator.stop();
    await worker.stop();
  });

  it('one worker should process two ready jobs', async () => {
    const generator = new HttpJobServer();
    generator.start();

    const createProofInput = randomBytes(32);
    const proofResult = generator.createProof(createProofInput);
    const vkResult = generator.getJoinSplitVk();

    // Create worker and call start to start consuming jobs.
    const { server, worker } = createWorker();
    worker.start();

    // Give worker a chance to do the work before calling stop.
    await sleep(100);

    await generator.stop();
    await worker.stop();

    expect(server.createProof).toHaveBeenCalledTimes(1);
    expect(server.getJoinSplitVerificationKey).toHaveBeenCalledTimes(1);
    await expect(proofResult).resolves.toEqual(await server.createProof(createProofInput));
    await expect(vkResult).resolves.toEqual(await server.getJoinSplitVerificationKey());
  });

  it('two workers should process two ready jobs', async () => {
    const generator = new HttpJobServer();
    generator.start();

    const createProofInput = randomBytes(32);
    const proofResult = generator.createProof(createProofInput);
    const vkResult = generator.getJoinSplitVk();

    // Create worker and call start to start consuming jobs.
    const { server: server1, worker: worker1 } = createWorker();
    const { server: server2, worker: worker2 } = createWorker();

    // Stagger worker job requests. Worker 1 requests first job, worker 2 requests second job.
    worker1.start();
    worker2.start();

    // Give workers a chance to do the work before calling stop.
    await sleep(100);

    await generator.stop();
    await worker1.stop();
    await worker2.stop();

    expect(server1.createProof).toHaveBeenCalledTimes(1);
    expect(server1.getJoinSplitVerificationKey).toHaveBeenCalledTimes(0);
    expect(server2.createProof).toHaveBeenCalledTimes(0);
    expect(server2.getJoinSplitVerificationKey).toHaveBeenCalledTimes(1);
    await expect(proofResult).resolves.toEqual(await server1.createProof(createProofInput));
    await expect(vkResult).resolves.toEqual(await server2.getJoinSplitVerificationKey());
  });

  it('two waiting workers should process two new jobs', async () => {
    const generator = new HttpJobServer();
    generator.start();

    // Create workers and call start to start consuming jobs.
    const { server: server1, worker: worker1 } = createWorker();
    const { server: server2, worker: worker2 } = createWorker();
    worker1.start();
    worker2.start();

    // Give workers a chance to request work.
    await sleep(100);

    const createProofInput = randomBytes(32);
    const proofResult = generator.createProof(createProofInput);
    const vkResult = generator.getJoinSplitVk();

    // Give workers a chance to service work.
    await sleep(100);

    await generator.stop();
    await worker1.stop();
    await worker2.stop();

    expect(server1.createProof).toHaveBeenCalledTimes(1);
    expect(server1.getJoinSplitVerificationKey).toHaveBeenCalledTimes(0);
    expect(server2.createProof).toHaveBeenCalledTimes(0);
    expect(server2.getJoinSplitVerificationKey).toHaveBeenCalledTimes(1);
    await expect(proofResult).resolves.toEqual(await server1.createProof(createProofInput));
    await expect(vkResult).resolves.toEqual(await server2.getJoinSplitVerificationKey());
  });

  it('worker pings server its processing job', async () => {
    // Any job that hasn't been pinged in 2s is up for grabs.
    const generator = new HttpJobServer(undefined, 2000);
    generator.start();

    // Create workers and call start to start consuming jobs.
    const { server: server1, worker: worker1 } = createWorker();
    const { server: server2, worker: worker2 } = createWorker();

    // Worker 1 will take its sweet time (3s).
    const expectedProofData = randomBytes(32);
    server1.createProof.mockReturnValue(new Promise(resolve => setTimeout(() => resolve(expectedProofData), 3000)));

    worker1.start();
    worker2.start();

    // Give workers a chance to request work.
    await sleep(100);

    const createProofInput = randomBytes(32);
    const proofResult = generator.createProof(createProofInput);

    // Give worker a chance to service work.
    await sleep(3000);

    await generator.stop();
    await worker1.stop();
    await worker2.stop();

    expect(server1.createProof).toHaveBeenCalledTimes(1);
    expect(server1.getJoinSplitVerificationKey).toHaveBeenCalledTimes(0);
    expect(server2.createProof).toHaveBeenCalledTimes(0);
    expect(server2.getJoinSplitVerificationKey).toHaveBeenCalledTimes(0);
    await expect(proofResult).resolves.toEqual(await server1.createProof(createProofInput));
  });

  it('worker will recover if server disappears while waiting for work', async () => {
    const { server, worker } = createWorker();

    {
      const generator = new HttpJobServer();
      generator.start();
      worker.start();

      // Give time for worker to request work.
      await sleep(100);

      // Kill server.
      await generator.stop();
    }

    {
      const generator = new HttpJobServer();
      generator.start();

      const createProofInput = randomBytes(32);
      const proofResult = await generator.createProof(createProofInput);

      expect(server.createProof).toHaveBeenCalledTimes(1);
      expect(proofResult).toEqual(await server.createProof(createProofInput));

      await generator.stop();
    }

    await worker.stop();
  });

  it('expired job will be reissued', async () => {
    const generator = new HttpJobServer(undefined, 3000);
    generator.start();

    // Create a job.
    const createProofInput = randomBytes(32);
    const proofResult = generator.createProof(createProofInput);

    // Start a worker, but our createProof implementation will now throw, preventing the job from completing.
    const { server, worker } = createWorker();
    // Save the successful value.
    const expectedValue = await server.createProof(createProofInput);
    server.createProof.mockRejectedValue(new Error('Fail.'));
    worker.start();

    // Give time for worker to fail the job, and enter its 1 second wait before retrying.
    await sleep(100);

    // Reset our implementation so next time it will succeed.
    server.createProof.mockResolvedValue(expectedValue);

    // The job will expire and become viable again after 3 seconds, after which this will resolve.
    await expect(proofResult).resolves.toEqual(await server.createProof(createProofInput));

    await worker.stop();
    await generator.stop();
  });
});
