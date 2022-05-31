import { randomBytes } from 'crypto';
import { toBigIntBE } from '../bigint_buffer';
import { BridgeId } from '../bridge_id';
import { GrumpkinAddress } from '../address';
import { ViewingKey } from '../viewing_key';
import { OffchainDefiDepositData } from './offchain_defi_deposit_data';

describe('OffchainDefiDepositData', () => {
  it('convert offchain defi deposit data to and from buffer', () => {
    const userData = new OffchainDefiDepositData(
      BridgeId.random(),
      randomBytes(32), // partialState
      GrumpkinAddress.random(), // partialStateSecretEphPubKey
      toBigIntBE(randomBytes(32)), // depositValue
      toBigIntBE(randomBytes(32)), // txFee
      ViewingKey.random(),
      123,
    );
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainDefiDepositData.SIZE);
    expect(OffchainDefiDepositData.fromBuffer(buf)).toEqual(userData);
  });

  it('throw if partial state is not 32 bytes', () => {
    expect(
      () =>
        new OffchainDefiDepositData(
          BridgeId.random(),
          randomBytes(33),
          GrumpkinAddress.random(),
          toBigIntBE(randomBytes(32)),
          toBigIntBE(randomBytes(32)),
          ViewingKey.random(),
          123,
        ),
    ).toThrow();
  });

  it('throw if viewing key is empty', () => {
    expect(
      () =>
        new OffchainDefiDepositData(
          BridgeId.random(),
          randomBytes(32),
          GrumpkinAddress.random(),
          toBigIntBE(randomBytes(32)),
          toBigIntBE(randomBytes(32)),
          ViewingKey.EMPTY,
          123,
        ),
    ).toThrow();
  });

  it('throw if buffer size is wrong', () => {
    expect(() => OffchainDefiDepositData.fromBuffer(randomBytes(OffchainDefiDepositData.SIZE - 1))).toThrow();
    expect(() => OffchainDefiDepositData.fromBuffer(randomBytes(OffchainDefiDepositData.SIZE + 1))).toThrow();
  });
});
