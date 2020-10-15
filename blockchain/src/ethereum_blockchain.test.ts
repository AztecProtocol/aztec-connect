import { Provider } from '@ethersproject/abstract-provider';
import { EthAddress } from 'barretenberg/address';
import { Block } from './blockchain';
import { Contracts } from './contracts';
import { EthereumBlockchain, EthereumBlockchainConfig } from './ethereum_blockchain';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('ethereum_blockchain', () => {
  let blockchain: EthereumBlockchain;
  let provider: Mockify<Provider>;
  let contracts: Mockify<Contracts>;

  const generateBlock = (rollupId: number) => ({
    txHash: Buffer.alloc(32, 0),
    created: new Date(),
    rollupId,
    rollupSize: 2,
    rollupProofData: Buffer.alloc(0),
    viewingKeysData: Buffer.alloc(0),
  });

  const blocks: Block[] = [generateBlock(0), generateBlock(1), generateBlock(2)];

  beforeEach(async () => {
    contracts = {
      getSupportedAssets: jest.fn(),
      getRollupStatus: jest.fn().mockResolvedValue({ nextRollupId: 0 }),
      getEscapeHatchStatus: jest.fn().mockResolvedValue({
        escapeOpen: false,
        numEscapeBlocksRemaining: 100,
      }),
      getRollupBlocksFrom: jest.fn().mockResolvedValue(blocks),
      getTokenContractAddresses: jest.fn().mockReturnValue([EthAddress.randomAddress()]),
      getRollupContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
    } as any;

    provider = {
      getBlockNumber: jest.fn().mockResolvedValue(blocks.length),
      getNetwork: jest.fn().mockResolvedValue({ chainId: 999 }),
      getTransactionReceipt: jest.fn(),
    } as any;

    const config: EthereumBlockchainConfig = {
      provider: provider as any,
      signer: provider as any,
      networkOrHost: 'test',
      console: false,
    };

    blockchain = new EthereumBlockchain(config, contracts as any);
    await blockchain.init();
  });

  afterEach(() => {
    blockchain.stop();
  });

  it('emit all historical blocks, then new blocks', async () => {
    const emitted: Block[] = [];
    blockchain.on('block', block => emitted.push(block));

    await blockchain.start();

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(0, 1);
    expect(emitted).toEqual(blocks);

    const newBlocks = [generateBlock(3), generateBlock(4)];
    provider.getBlockNumber.mockResolvedValue(5);
    contracts.getRollupBlocksFrom.mockResolvedValueOnce(newBlocks);

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(3, 1);
    expect(emitted).toEqual([...blocks, ...newBlocks]);
  });

  it('skip start from blocks', async () => {
    contracts.getRollupBlocksFrom.mockResolvedValue([]);
    await blockchain.start(1);
    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(1, 1);
  });

  it('require more confirmations leading into escape window', async () => {
    contracts.getEscapeHatchStatus.mockResolvedValue({
      escapeOpen: false,
      numEscapeBlocksRemaining: 12,
    });

    await blockchain.start();

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(0, 12);
  });

  it('require more confirmations inside escape window', async () => {
    contracts.getEscapeHatchStatus.mockResolvedValue({
      escapeOpen: true,
      numEscapeBlocksRemaining: 100,
    });

    await blockchain.start();

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(0, 12);
  });

  it('get transaction receipt with enough confirmations', async () => {
    contracts.getEscapeHatchStatus.mockResolvedValue({
      escapeOpen: true,
      numEscapeBlocksRemaining: 1,
    });

    provider.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 1,
    });

    provider.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 6,
    });

    provider.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 12,
    });

    await blockchain.start();

    await blockchain.getTransactionReceipt(Buffer.alloc(32));

    expect(provider.getTransactionReceipt).toHaveBeenCalledTimes(3);
  });
});
