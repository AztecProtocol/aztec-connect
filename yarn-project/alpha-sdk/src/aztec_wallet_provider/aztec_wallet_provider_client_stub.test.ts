import { AztecWalletProviderClientStub } from './aztec_wallet_provider_client_stub.js';
import { AztecWalletProviderServerStub } from './aztec_wallet_provider_server_stub.js';
import { EthAddress, GrumpkinAddress } from '@aztec/barretenberg/address';
import { DispatchMsg } from '@aztec/barretenberg/transport';
import { AliasHash } from '@aztec/barretenberg/account_id';
import { HashPath, MemoryMerkleTree } from '@aztec/barretenberg/merkle_tree';
import { WorldStateConstants } from '@aztec/barretenberg/world_state';
import { BarretenbergWasm } from '@aztec/barretenberg/wasm';
import { Schnorr, SinglePedersen } from '@aztec/barretenberg/crypto';
import { Grumpkin } from '@aztec/barretenberg/ecc';
import { ConstantKeyPair, ConstantKeyStore } from '../key_store/index.js';
import { CorePaymentTx } from '../core_tx/core_payment_tx.js';
import { ProofRequestData, ProofRequestDataType } from '../index.js';
import { jest } from '@jest/globals';

jest.setTimeout(10_000);

const EXAMPLE_PUBLIC_KEY =
  '0x164f01b1011a1b292217acf53eef4d74f625f6e9bd5edfdb74c56fd81aafeebb0ed3273ce80b35f29e5a2997ca397a6f1b874f3083f16948e6ac8e8a3ad649d5';

describe('AztecWalletProviderClientStub JSON serialization tests', () => {
  let wasm: BarretenbergWasm;
  let clientStub: AztecWalletProviderClientStub;
  let accountKeyPair: ConstantKeyPair;
  beforeAll(async () => {
    wasm = await BarretenbergWasm.new();
    const grumpkin = new Grumpkin(wasm);
    const schnorr = new Schnorr(wasm);
    accountKeyPair = ConstantKeyPair.random(grumpkin, schnorr);
    const keyStore = new ConstantKeyStore(accountKeyPair, accountKeyPair, []);

    // TODO(AD): Instantiate proper BlockSource and test decryptBlocks
    const serverStub = await AztecWalletProviderServerStub.new(keyStore, undefined as any, wasm, /*proverless*/ true);
    clientStub = new AztecWalletProviderClientStub({
      async request(payload: DispatchMsg) {
        if (payload.fn === 'walletProviderDispatch') {
          const [{ fn, args }] = payload.args;
          return await serverStub[fn](...args);
        }
        return undefined;
      },
    });
  });

  it('should exercise requestProofInputs and requestProofs', async () => {
    const publicOwner = EthAddress.fromString('0xc6d9d2cd449a754c494264e1809c50e34d64562b');
    const aliasHash = AliasHash.random();
    const connectResult = await clientStub.connect([]);
    expect(connectResult instanceof GrumpkinAddress).toBe(true);

    const proofRequestData: ProofRequestData = {
      type: ProofRequestDataType.PaymentProofRequestData,
      accountPublicKey: accountKeyPair.getPublicKey(),
      proofId: 1,
      assetValue: {
        assetId: 0,
        value: 1n,
      },
      fee: {
        assetId: 0,
        value: 1n,
      },
      publicOwner,
      recipient: GrumpkinAddress.fromString(EXAMPLE_PUBLIC_KEY),
      recipientSpendingKeyRequired: false,
      inputNotes: [],
      spendingKeyAccount: {
        spendingPublicKey: accountKeyPair.getPublicKey(),
        aliasHash,
        accountIndex: 0,
        accountPath: HashPath.ZERO(
          WorldStateConstants.DATA_TREE_DEPTH,
          MemoryMerkleTree.ZERO_ELEMENT,
          new SinglePedersen(wasm),
        ),
      },
      dataRoot: Buffer.alloc(32),
      allowChain: false,
      hideNoteCreator: true,
    };
    const inputs = await clientStub.requestProofInputs(proofRequestData);
    const signatures = await clientStub.signProofs(inputs);
    // request inputs + create proofs + create should be equivalent to request proofs
    const createProofOutputs = await clientStub.createProofs(inputs, signatures);
    const requestProofOutputs = await clientStub.requestProofs(proofRequestData);
    expect(createProofOutputs[0].tx instanceof CorePaymentTx).toBe(true);
    expect(createProofOutputs[0].proofData.noteTreeRoot).toEqual(requestProofOutputs[0].proofData.noteTreeRoot);
  });
  it('should get user keys over JSON transport', async () => {
    expect(await clientStub.getAccountPublicKey()).toEqual(accountKeyPair.getPublicKey());
    expect(await clientStub.getSpendingPublicKey()).toEqual(accountKeyPair.getPublicKey());
  });
  // TODO(AD): use mocked BlockSource to implement
  // it('should decrypt blocks over JSON transport', async () => {
  //   const block = new Block(
  //     TxHash.random(),
  //     new Date(),
  //     1,
  //     2,
  //     RollupProofData.randomData(1, 2).toBuffer(),
  //     [],
  //     [],
  //     0,
  //     BigInt(0),
  //   );
  //   const blockContext = BlockContext.fromBlock(block, new SinglePedersen(wasm));
  //   const decryptedBlocks = await clientStub.decryptBlocks([blockContext]);
  //   console.log(decryptedBlocks);
  // });
});
