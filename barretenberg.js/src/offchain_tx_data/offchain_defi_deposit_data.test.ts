import { randomBytes } from '../crypto/index.js';
import { toBigIntBE } from '../bigint_buffer/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';
import { GrumpkinAddress } from '../address/index.js';
import { ViewingKey } from '../viewing_key/index.js';
import { OffchainDefiDepositData } from './offchain_defi_deposit_data.js';

describe('OffchainDefiDepositData', () => {
  it('convert offchain defi deposit data to and from buffer', () => {
    const offchainData = new OffchainDefiDepositData(
      BridgeCallData.random(),
      randomBytes(32), // partialState
      GrumpkinAddress.random(), // partialStateSecretEphPubKey
      toBigIntBE(randomBytes(32)), // depositValue
      toBigIntBE(randomBytes(32)), // txFee
      ViewingKey.random(),
      123,
    );
    const buf = offchainData.toBuffer();
    expect(buf.length).toBe(OffchainDefiDepositData.SIZE);
    expect(OffchainDefiDepositData.fromBuffer(buf)).toEqual(offchainData);
  });

  it('get viewing key buffer from offchain data buffer', () => {
    const viewingKey = ViewingKey.random();
    const offchainData = new OffchainDefiDepositData(
      BridgeCallData.random(),
      randomBytes(32), // partialState
      GrumpkinAddress.random(), // partialStateSecretEphPubKey
      toBigIntBE(randomBytes(32)), // depositValue
      toBigIntBE(randomBytes(32)), // txFee
      viewingKey,
      123,
    );
    const buf = offchainData.toBuffer();
    expect(OffchainDefiDepositData.getViewingKeyBuffer(buf)).toEqual(viewingKey.toBuffer());
  });

  it('throw if partial state is not 32 bytes', () => {
    expect(
      () =>
        new OffchainDefiDepositData(
          BridgeCallData.random(),
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
          BridgeCallData.random(),
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
