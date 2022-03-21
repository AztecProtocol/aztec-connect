import { OffchainDefiClaimData } from './offchain_defi_claim_data';

describe('OffchainDefiClaimData', () => {
  it('convert offchain defi claim data to and from buffer', () => {
    const userData = new OffchainDefiClaimData();
    const buf = userData.toBuffer();
    expect(buf.length).toBe(OffchainDefiClaimData.SIZE);
    expect(OffchainDefiClaimData.fromBuffer(buf)).toEqual(userData);
  });
});
