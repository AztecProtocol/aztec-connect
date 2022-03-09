import { Blockchain } from '@aztec/barretenberg/blockchain';
import { BridgeConfig } from '@aztec/barretenberg/bridge_id';
import { BridgeResolver } from '.';

const bridgeConfigs: BridgeConfig[] = [
  {
    bridgeId: 1n,
    numTxs: 5,
    fee: 500000n,
    rollupFrequency: 2,
  },
  {
    bridgeId: 2n,
    numTxs: 10,
    fee: undefined,
    rollupFrequency: 4,
  },
];

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const BLOCKCHAIN_BRIDGE_GAS = 200000n;

const getFullBridgeGas = (id: number) =>
  id > bridgeConfigs.length ? undefined : bridgeConfigs[id - 1].fee ?? BLOCKCHAIN_BRIDGE_GAS;

describe('Bridge Resolver', () => {
  let blockchain: Mockify<Blockchain>;
  let bridgeResolver: BridgeResolver;
  const defaultDeFiBatchSize = 10;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    blockchain = {
      getBridgeGas: jest.fn().mockImplementation((bridgeId: bigint) => {
        const id = Number(bridgeId);
        return getFullBridgeGas(id);
      }),
      getBlockchainStatus: jest.fn().mockImplementation(() => {
        return {
          allowThirdPartyContracts: false,
        };
      }),
    } as any;

    bridgeResolver = new BridgeResolver(bridgeConfigs, blockchain, defaultDeFiBatchSize);
  });

  it('returns correct bridge config', () => {
    expect(bridgeResolver.getBridgeConfig(bridgeConfigs[0].bridgeId)).toEqual(bridgeConfigs[0]);
    expect(bridgeResolver.getBridgeConfig(bridgeConfigs[1].bridgeId)).toEqual(bridgeConfigs[1]);
  });

  it('returns all bridge Ids', () => {
    expect(bridgeResolver.getConfiguredBridgeIds()).toEqual(bridgeConfigs.map(bc => bc.bridgeId));
  });

  it('returns all bridge configs', () => {
    expect(bridgeResolver.getBridgeConfigs()).toEqual(bridgeConfigs);
  });

  it('returns correct full bridge gas', () => {
    expect(bridgeResolver.getFullBridgeGas(bridgeConfigs[0].bridgeId)).toEqual(bridgeConfigs[0].fee);
    expect(bridgeResolver.getFullBridgeGas(bridgeConfigs[1].bridgeId)).toEqual(BLOCKCHAIN_BRIDGE_GAS);
  });

  it('returns correct single tx gas in the bridge config', () => {
    expect(bridgeResolver.getMinBridgeTxGas(bridgeConfigs[0].bridgeId)).toEqual(
      bridgeConfigs[0].fee! / BigInt(bridgeConfigs[0].numTxs),
    );
    expect(bridgeResolver.getMinBridgeTxGas(bridgeConfigs[1].bridgeId)).toEqual(
      BLOCKCHAIN_BRIDGE_GAS / BigInt(bridgeConfigs[1].numTxs),
    );
  });

  it('returns correct single tx gas NOT in the bridge config and when the acceptAllBridges flag is set', () => {
    const unregisteredBridgeFee = 100000n;
    blockchain.getBridgeGas.mockReturnValueOnce(unregisteredBridgeFee);
    blockchain.getBlockchainStatus.mockReturnValueOnce({ allowThirdPartyContracts: true });

    expect(bridgeResolver.getMinBridgeTxGas(3n)).toEqual(unregisteredBridgeFee / BigInt(defaultDeFiBatchSize));
  });

  it('throws for a tx  NOT in the bridge config and when the acceptAllBridges flag is FALSE', () => {
    bridgeResolver = new BridgeResolver(bridgeConfigs, blockchain, defaultDeFiBatchSize);
    blockchain.getBlockchainStatus.mockReturnValue({ allowThirdPartyContracts: false });
    expect(() => bridgeResolver.getMinBridgeTxGas(3n)).toThrow('Cannot get gas. Unrecognised DeFi-bridge');
  });
});
