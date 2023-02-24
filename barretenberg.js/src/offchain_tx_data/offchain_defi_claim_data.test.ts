import { randomBytes } from '../crypto/index.js';
import { OffchainDefiClaimData } from './offchain_defi_claim_data.js';

describe('OffchainDefiClaimData', () => {
  it('convert offchain defi claim data to and from buffer', () => {
    const userData = new OffchainDefiClaimData();
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainDefiClaimData.SIZE);
    expect(OffchainDefiClaimData.fromBuffer(buf)).toEqual(userData);
  });

  it('throw if buffer size is wrong', () => {
    expect(() => OffchainDefiClaimData.fromBuffer(randomBytes(OffchainDefiClaimData.SIZE + 1))).toThrow();
  });
});
