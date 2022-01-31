import { EthAddress } from '@aztec/barretenberg/address';
import { BlockchainBridge, TxHash } from '@aztec/barretenberg/blockchain';
import { Block } from '@aztec/barretenberg/block_source';
import { BitConfig, BridgeId } from '@aztec/barretenberg/bridge_id';
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
    gasLimit: 150000n,
  },
  {
    id: 2,
    address: new EthAddress(randomBytes(20)),
    gasLimit: 250000n,
  },
];

describe('ethereum_blockchain', () => {
  let blockchain: EthereumBlockchain;
  let contracts: Mockify<Contracts>;

  const generateBlock = (rollupId: number) => ({
    txHash: TxHash.random(),
    created: new Date(),
    rollupId,
    rollupSize: 2,
    rollupProofData: RollupProofData.randomData(1, 2).toBuffer(),
    offchainTxData: [],
    interactionResult: [],
    gasPrice: BigInt(0),
    gasUsed: 0,
  });

  const blocks: Block[] = [generateBlock(0), generateBlock(1), generateBlock(2)];

  const getRollupStateFromBlock = (block: Block) => {
    const nextRollupId = block.rollupId + 1;
    const dataSize = 16;
    const dataRoot = Buffer.alloc(32);
    const nullRoot = Buffer.alloc(32);
    const rootRoot = Buffer.alloc(32);
    const defiRoot = Buffer.alloc(32);

    return {
      nextRollupId,
      dataSize,
      dataRoot,
      nullRoot,
      rootRoot,
      defiRoot,
    };
  };

  beforeAll(() => {
    const getInitRootsMock = jest.fn(() => {
      return {
        initDataRoot: Buffer.alloc(32),
        initNullRoot: Buffer.alloc(32),
        initRootsRoot: Buffer.alloc(32),
      };
    });
    const MockInitHelpers = InitHelpers as jest.Mocked<typeof InitHelpers>;
    MockInitHelpers.getInitRoots.mockImplementation(getInitRootsMock);
  });

  beforeEach(async () => {
    contracts = {
      getAssets: jest.fn().mockReturnValue([]),
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
      getBlockNumber: jest.fn().mockResolvedValue(blocks.length),
      getChainId: jest.fn().mockResolvedValue(999),
      getTransactionReceipt: jest.fn(),
      getRollupStateFromBlock: jest.fn().mockReturnValue(getRollupStateFromBlock(blocks[2])),
      getBridgeGas: jest.fn().mockImplementation((id: number) => blockchainBridges[id - 1].gasLimit),
      getSupportedBridges: jest.fn().mockImplementation(() => {
        return [...blockchainBridges.values()].map((b: BlockchainBridge) => b.address);
      }),
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
    let bridge = new BridgeId(1, 0, 0, 0, 0, new BitConfig(false, false, false, false, false, false), 0);
    expect(blockchain.getBridgeGas(bridge.toBigInt())).toEqual(blockchainBridges[0].gasLimit);
    bridge = new BridgeId(2, 0, 0, 0, 0, new BitConfig(false, false, false, false, false, false), 0);
    expect(blockchain.getBridgeGas(bridge.toBigInt())).toEqual(blockchainBridges[1].gasLimit);
  });
});
