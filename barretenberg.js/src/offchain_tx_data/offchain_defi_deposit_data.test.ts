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
      GrumpkinAddress.randomAddress(), // partialStateSecretEphPubKey
      toBigIntBE(randomBytes(32)), // depositValue
      toBigIntBE(randomBytes(32)), // txFee
      ViewingKey.random(),
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
          GrumpkinAddress.randomAddress(),
          toBigIntBE(randomBytes(32)),
          toBigIntBE(randomBytes(32)),
          ViewingKey.random(),
        ),
    ).toThrow();
  });
});
