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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});

    blockchain = {
      getBridgeGas: jest.fn().mockImplementation((bridgeId: bigint) => {
        const id = Number(bridgeId);
        return getFullBridgeGas(id);
      }),
    } as any;

    bridgeResolver = new BridgeResolver(bridgeConfigs, blockchain);
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

    expect(() => {
      bridgeResolver.getFullBridgeGas(3n);
    }).toThrow(`Failed to retrieve bridge cost for bridge ${3n.toString()}`);
  });

  it('returns correct single tx gas', () => {
    expect(bridgeResolver.getMinBridgeTxGas(bridgeConfigs[0].bridgeId)).toEqual(
      bridgeConfigs[0].fee! / BigInt(bridgeConfigs[0].numTxs),
    );
    expect(bridgeResolver.getMinBridgeTxGas(bridgeConfigs[1].bridgeId)).toEqual(
      BLOCKCHAIN_BRIDGE_GAS / BigInt(bridgeConfigs[1].numTxs),
    );

    expect(() => {
      bridgeResolver.getMinBridgeTxGas(3n);
    }).toThrow('Cannot get gas. Unrecognised Defi-bridge');
  });
});
