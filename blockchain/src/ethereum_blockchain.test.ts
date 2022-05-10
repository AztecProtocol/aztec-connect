import { EthAddress } from '@aztec/barretenberg/address';
import { BlockchainAsset, BlockchainBridge, TxHash } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { InitHelpers } from '@aztec/barretenberg/environment';
import { RollupProofData } from '@aztec/barretenberg/rollup_proof';
import { randomBytes } from 'crypto';
import { Contracts } from './contracts';
import { EthereumBlockchain, EthereumBlockchainConfig } from './ethereum_blockchain';

jest.mock('@aztec/barretenberg/environment');

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const blockchainBridges: BlockchainBridge[] = [
  {
    id: 1,
    address: new EthAddress(randomBytes(20)),
    gasLimit: 150000,
  },
  {
    id: 2,
    address: new EthAddress(randomBytes(20)),
    gasLimit: 250000,
  },
];

const blockchainAssets: BlockchainAsset[] = [
  {
    address: new EthAddress(randomBytes(20)),
    decimals: 18,
    symbol: 'A',
    name: 'Asset A',
    isFeePaying: true,
    gasConstants: [],
    gasLimit: 123,
  },
  {
    address: new EthAddress(randomBytes(20)),
    decimals: 6,
    symbol: 'B',
    name: 'Asset B',
    isFeePaying: false,
    gasConstants: [],
    gasLimit: 456,
  },
];

describe('ethereum_blockchain', () => {
  let blockchain: EthereumBlockchain;
  let contracts: Mockify<Contracts>;
  let blocks: Block[];

  const generateBlock = (rollupId: number) =>
    new Block(
      TxHash.random(),
      new Date(),
      rollupId,
      2,
      RollupProofData.randomData(1, 2).toBuffer(),
      [],
      [],
      0,
      BigInt(0),
    );

  beforeAll(() => {
    const getInitRootsMock = jest.fn(() => {
      return {
        dataRoot: Buffer.alloc(32),
        nullRoot: Buffer.alloc(32),
        rootsRoot: Buffer.alloc(32),
      };
    });
    const MockInitHelpers = InitHelpers as jest.Mocked<typeof InitHelpers>;
    MockInitHelpers.getInitRoots.mockImplementation(getInitRootsMock);
  });

  beforeEach(async () => {
    blocks = [generateBlock(0), generateBlock(1), generateBlock(2)];

    contracts = {
      init: jest.fn(),
      updateAssets: jest.fn(),
      getPerRollupState: jest.fn().mockResolvedValue({ nextRollupId: 0 }),
      getPerBlockState: jest.fn().mockResolvedValue({
        escapeOpen: false,
        numEscapeBlocksRemaining: 100,
      }),
      getRollupBlocksFrom: jest.fn().mockResolvedValue(blocks),
      getRollupBlock: jest.fn().mockResolvedValue(blocks[blocks.length - 1]),
      getRollupContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
      getFeeDistributorContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
      getVerifierContractAddress: jest.fn().mockReturnValue(EthAddress.randomAddress()),
      getBlockNumber: jest.fn().mockImplementation(async () => blocks.length),
      getChainId: jest.fn().mockResolvedValue(999),
      getTransactionReceipt: jest.fn(),
      getTransactionByHash: jest.fn().mockReturnValue({}),
      getAssets: jest.fn().mockImplementation(() => blockchainAssets),
      getSupportedBridges: jest.fn().mockImplementation(() => blockchainBridges),
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

  afterEach(async () => {
    await blockchain.stop();
  });

  it('correct initial state', async () => {
    const status = await blockchain.getBlockchainStatus();
    const lastRollup = RollupProofData.fromBuffer(blocks[blocks.length - 1].rollupProofData);
    expect(status.dataRoot).toEqual(lastRollup.newDataRoot);
    expect(status.nullRoot).toEqual(lastRollup.newNullRoot);
    expect(status.rootRoot).toEqual(lastRollup.newDataRootsRoot);
    expect(status.defiRoot).toEqual(lastRollup.newDefiRoot);
    expect(status.bridges).toEqual(blockchainBridges);
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

  it('correctly returns bridge gas', async () => {
    await blockchain.start();
    {
      const bridge = new BridgeId(1, 0, 0);
      expect(blockchain.getBridgeGas(bridge.toBigInt())).toEqual(blockchainBridges[0].gasLimit);
    }
    {
      const bridge = new BridgeId(2, 0, 0);
      expect(blockchain.getBridgeGas(bridge.toBigInt())).toEqual(blockchainBridges[1].gasLimit);
    }
  });

  it('correctly refreshes bridges and assets', async () => {
    contracts.getAssets.mockImplementation(() => []);
    contracts.getSupportedBridges.mockResolvedValueOnce([]);

    await blockchain.start();

    const statusBefore = blockchain.getBlockchainStatus();
    expect(statusBefore.assets.length).toBe(0);
    expect(statusBefore.bridges.length).toBe(0);
    contracts.updateAssets.mockClear();

    contracts.getAssets.mockReturnValueOnce(blockchainAssets);
    contracts.getSupportedBridges.mockResolvedValueOnce(blockchainBridges);

    // advance one block
    blocks.push(generateBlock(3));

    // we need to wait 1 full second for the blocks to be polled.
    await new Promise(r => setTimeout(r, 1000));

    const statusAfter = blockchain.getBlockchainStatus();
    expect(statusAfter.assets).toEqual(blockchainAssets);
    expect(statusAfter.bridges).toEqual(blockchainBridges);
    expect(contracts.updateAssets).toHaveBeenCalledTimes(1);
  });
});
