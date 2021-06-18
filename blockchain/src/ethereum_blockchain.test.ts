import { EthAddress } from '@aztec/barretenberg/address';
import { Block } from '@aztec/barretenberg/block_source';
import { TxHash } from '@aztec/barretenberg/tx_hash';
import { Contracts } from './contracts';
import { EthereumBlockchain, EthereumBlockchainConfig } from './ethereum_blockchain';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('ethereum_blockchain', () => {
  let blockchain: EthereumBlockchain;
  let contracts: Mockify<Contracts>;

  const generateBlock = (rollupId: number) => ({
    txHash: TxHash.random(),
    created: new Date(),
    rollupId,
    rollupSize: 2,
    rollupProofData: Buffer.alloc(0),
    viewingKeysData: Buffer.alloc(0),
    interactionResult: [],
    gasPrice: BigInt(0),
    gasUsed: 0,
  });

  const blocks: Block[] = [generateBlock(0), generateBlock(1), generateBlock(2)];

  beforeEach(async () => {
    contracts = {
      getAssets: jest.fn().mockReturnValue([]),
      getPerRollupState: jest.fn().mockResolvedValue({ nextRollupId: 0 }),
      getPerBlockState: jest.fn().mockResolvedValue({
        escapeOpen: false,
        numEscapeBlocksRemaining: 100,
      }),
      getRollupBlocksFrom: jest.fn().mockResolvedValue(blocks),
      getRollupContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
      getFeeDistributorContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
      getBlockNumber: jest.fn().mockResolvedValue(blocks.length),
      getNetwork: jest.fn().mockResolvedValue({ chainId: 999 }),
      getTransactionReceipt: jest.fn(),
    } as any;

    const config: EthereumBlockchainConfig = {
      console: false,
      minConfirmation: 1,
      minConfirmationEHW: 12,
      pollInterval: 1000,
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
    contracts.getBlockNumber.mockResolvedValue(5);
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
    contracts.getPerBlockState.mockResolvedValue({
      escapeOpen: false,
      numEscapeBlocksRemaining: 12,
    });

    await blockchain.start();

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(0, 12);
  });

  it('require more confirmations inside escape window', async () => {
    contracts.getPerBlockState.mockResolvedValue({
      escapeOpen: true,
      numEscapeBlocksRemaining: 100,
    });

    await blockchain.start();

    expect(contracts.getRollupBlocksFrom).toHaveBeenCalledWith(0, 12);
  });

  it('get transaction receipt with enough confirmations', async () => {
    contracts.getPerBlockState.mockResolvedValue({
      escapeOpen: true,
      numEscapeBlocksRemaining: 1,
    });

    contracts.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 1,
    });

    contracts.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 6,
    });

    contracts.getTransactionReceipt.mockResolvedValueOnce({
      status: 1,
      blockNumber: 0,
      confirmations: 12,
    });

    await blockchain.start();

    await blockchain.getTransactionReceiptSafe(TxHash.random());

    expect(contracts.getTransactionReceipt).toHaveBeenCalledTimes(3);
  });
});
