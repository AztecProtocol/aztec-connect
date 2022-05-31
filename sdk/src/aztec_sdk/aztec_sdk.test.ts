import { GrumpkinAddress } from '@aztec/barretenberg/address';
import { BridgeId } from '@aztec/barretenberg/bridge_id';
import { ClientEthereumBlockchain } from '@aztec/blockchain';
import { CoreSdk } from '../core_sdk';
import { AztecSdk } from './aztec_sdk';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

describe('aztec sdk', () => {
  let core: Mockify<CoreSdk>;
  let blockchain: Mockify<ClientEthereumBlockchain>;
  let sdk: AztecSdk;
  const assetId = 1;
  const noneFeePayingAssetId = 2;

  beforeEach(() => {
    core = {
      on: jest.fn(),
      getTxFees: jest.fn().mockResolvedValue([
        [
          { assetId, value: 2n },
          { assetId, value: 3n },
        ], // deposit
        [
          { assetId, value: 5n },
          { assetId, value: 7n },
        ], // transfer
      ]),
      getDefiFees: jest.fn().mockResolvedValue([
        { assetId, value: 10n },
        { assetId, value: 20n },
        { assetId, value: 30n },
      ]),
      pickNote: jest.fn().mockResolvedValue(undefined),
      pickNotes: jest.fn().mockResolvedValue([]),
      getMaxSpendableValue: jest.fn().mockResolvedValue(0n),
    } as any;

    blockchain = {} as any;

    const provider = {} as any;

    sdk = new AztecSdk(core, blockchain as any, provider);
  });

  describe('getDefiFees', () => {
    const userId = GrumpkinAddress.random();

    it('return fees for a bridge without specifying deposit value', async () => {
      const bridgeId = new BridgeId(0, assetId, 3);
      expect(await sdk.getDefiFees(bridgeId)).toEqual([
        { assetId, value: 10n + 5n },
        { assetId, value: 20n + 5n },
        { assetId, value: 30n + 5n },
      ]);
    });

    it('return fees for a bridge whose input asset is not a fee paying asset', async () => {
      const bridgeId = new BridgeId(0, noneFeePayingAssetId, 3);
      expect(await sdk.getDefiFees(bridgeId)).toEqual([
        { assetId, value: 10n + 5n * 2n },
        { assetId, value: 20n + 5n * 2n },
        { assetId, value: 30n + 5n * 2n },
      ]);
    });

    it('return fees for defi interaction that only needs a defi deposit proof', async () => {
      const depositValue = { assetId, value: 100n };

      // Found two notes that sum to (deposit + fee === 100n + 10n).
      core.pickNotes.mockResolvedValue([{ value: 50n }, { value: 60n }]);

      const bridgeId = new BridgeId(0, assetId, 3);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n },
        { assetId, value: 20n + 5n },
        { assetId, value: 30n + 5n },
      ]);
    });

    it('return fees for defi interaction that needs a join split proof and a defi deposit proof', async () => {
      const depositValue = { assetId, value: 100n };

      // Found two notes whose sum is larger than (deposit + fee === 100n + 10n).
      core.pickNotes.mockResolvedValue([{ value: 50n }, { value: 61n }]);

      const bridgeId = new BridgeId(0, assetId, 3);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n + 5n },
        { assetId, value: 20n + 5n },
        { assetId, value: 30n + 5n },
      ]);
    });

    it('return fees for defi interaction that needs a defi deposit proof and a fee paying tx', async () => {
      const depositValue = { assetId: noneFeePayingAssetId, value: 100n };

      // Found two notes that sum to (deposit === 100n).
      core.pickNotes.mockResolvedValue([{ value: 40n }, { value: 60n }]);

      const bridgeId = new BridgeId(0, noneFeePayingAssetId, 3);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n + 5n },
        { assetId, value: 20n + 5n * 2n },
        { assetId, value: 30n + 5n * 2n },
      ]);
    });

    it('return fees for defi interaction that needs a join split, a defi deposit, and a fee paying tx', async () => {
      const depositValue = { assetId: noneFeePayingAssetId, value: 100n };

      // Found two notes whose sum is larger than (deposit === 100n).
      core.pickNotes.mockResolvedValue([{ value: 40n }, { value: 61n }]);

      const bridgeId = new BridgeId(0, noneFeePayingAssetId, 3);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n + 5n * 2n },
        { assetId, value: 20n + 5n * 2n },
        { assetId, value: 30n + 5n * 2n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and needs a defi deposit proof', async () => {
      const depositValue = { assetId, value: 100n };

      // Input asset A: Found a note whose value equals (deposit + fee === 100n + 10n).
      // Input asset B: Found a note whose value equals (deposit === 100n).
      core.pickNote.mockResolvedValueOnce({ value: 110n });
      core.pickNote.mockResolvedValueOnce({ value: 100n });

      const bridgeId = new BridgeId(0, assetId, 3, 4);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n },
        { assetId, value: 20n + 5n },
        { assetId, value: 30n + 5n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and needs a join split proof and a defi deposit proof', async () => {
      const depositValue = { assetId, value: 100n };

      // Input asset A: Found a note whose value is larger than (deposit + fee === 100n + 10n).
      // Input asset B: Found a note whose value equals (deposit === 100n).
      core.pickNote.mockResolvedValueOnce({ value: 111n });
      core.pickNote.mockResolvedValueOnce({ value: 100n });

      const bridgeId = new BridgeId(0, assetId, 3, 4);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n + 5n },
        { assetId, value: 20n + 5n },
        { assetId, value: 30n + 5n },
      ]);
    });

    it('return fees for defi interaction that has two input assets and needs a join split proof, a defi deposit proof and a fee paying tx', async () => {
      const depositValue = { assetId: noneFeePayingAssetId, value: 100n };

      // Input asset A: Found a note whose value is larger than (deposit + fee === 100n + 10n).
      // Input asset B: Found a note whose value equals (deposit === 100n).
      core.pickNote.mockResolvedValueOnce({ value: 111n });
      core.pickNote.mockResolvedValueOnce({ value: 100n });

      const bridgeId = new BridgeId(0, noneFeePayingAssetId, 3, 4);
      expect(await sdk.getDefiFees(bridgeId, userId, depositValue)).toEqual([
        { assetId, value: 10n + 5n * 2n },
        { assetId, value: 20n + 5n * 2n },
        { assetId, value: 30n + 5n * 2n },
      ]);
    });
  });
});
