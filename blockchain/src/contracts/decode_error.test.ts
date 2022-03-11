import { EthAddress } from '@aztec/barretenberg/address';
import { Contract } from 'ethers';
import { decodeErrorFromContract } from './decode_error';

describe('decode_error', () => {
  it('should decode error', async () => {
    const abi = [
      {
        inputs: [
          {
            internalType: 'bytes32',
            name: 'oldStateHash',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'newStateHash',
            type: 'bytes32',
          },
        ],
        name: 'INCORRECT_STATE_HASH',
        type: 'error',
      },
    ];
    const contract = new Contract(EthAddress.ZERO.toString(), abi);
    const data =
      '0x34fddf40160e1512008ebe521f7650fddad39c8a4f092fc451263be0190d631da26d345f88b748f29261d3cc053519106d94b965cd94d9143d58104f9becb80814d6917c';

    const error = await decodeErrorFromContract(contract, data);

    expect(error).not.toBeUndefined();
    expect(error!.name).toBe('INCORRECT_STATE_HASH');
  });
});
