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

    const error = decodeErrorFromContract(contract, data);

    expect(error).not.toBeUndefined();
    expect(error!.name).toBe('INCORRECT_STATE_HASH');
  });

  /* Not sure of the long term viability of this test. But might prove useful to keep around.
  it('should correctly decode real failed goerli tx', async () => {
    const contract = new Contract(EthAddress.ZERO.toString(), abi);
    const provider = new JsonRpcProvider('https://goerli.infura.io/v3/6a04b7c89c5b421faefde663f787aa35');
    const err = await decodeErrorFromContractByTxHash(
      contract,
      TxHash.fromString('0x8b2e077c71709f1b3eadcb66cf8822d232d0ce84ab51fcf182e169de02e8d3a7'),
      provider,
    );
    expect(err).not.toBeUndefined();
    expect(err!.name).toBe('INVALID_PROVIDER');
  });
  */
});
