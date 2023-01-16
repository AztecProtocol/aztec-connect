import { GrumpkinAddress } from '../address/index.js';
import { toBigIntBE, toBufferBE } from '../bigint_buffer/index.js';
import { BridgeCallData } from '../bridge_call_data/index.js';
import { numToUInt32BE } from '../serialize/index.js';
import { ViewingKey } from '../viewing_key/index.js';

enum DataSizes {
  BRIDGE_CALL_DATA = BridgeCallData.SIZE,
  PARTIAL_STATE = 32,
  PARTIAL_STATE_SECRET_EPH_PUB_KEY = GrumpkinAddress.SIZE,
  DEPOSIT_VALUE = 32,
  TX_FEE = 32,
  VIEWING_KEY = ViewingKey.SIZE,
  TX_REF_NO = 4,
}

enum DataOffsets {
  BRIDGE_CALL_DATA = 0,
  PARTIAL_STATE = DataOffsets.BRIDGE_CALL_DATA + DataSizes.BRIDGE_CALL_DATA,
  PARTIAL_STATE_SECRET_EPH_PUB_KEY = DataOffsets.PARTIAL_STATE + DataSizes.PARTIAL_STATE,
  DEPOSIT_VALUE = DataOffsets.PARTIAL_STATE_SECRET_EPH_PUB_KEY + DataSizes.PARTIAL_STATE_SECRET_EPH_PUB_KEY,
  TX_FEE = DataOffsets.DEPOSIT_VALUE + DataSizes.DEPOSIT_VALUE,
  VIEWING_KEY = DataOffsets.TX_FEE + DataSizes.TX_FEE,
  TX_REF_NO = DataOffsets.VIEWING_KEY + DataSizes.VIEWING_KEY,
}

export class OffchainDefiDepositData {
  static EMPTY = new OffchainDefiDepositData(
    BridgeCallData.ZERO,
    Buffer.alloc(32),
    GrumpkinAddress.ZERO,
    BigInt(0),
    BigInt(0),
    new ViewingKey(Buffer.alloc(ViewingKey.SIZE)),
  );
  static SIZE = OffchainDefiDepositData.EMPTY.toBuffer().length;

  static getViewingKeyBuffer(buf: Buffer) {
    return buf.slice(DataOffsets.VIEWING_KEY, DataOffsets.VIEWING_KEY + DataSizes.VIEWING_KEY);
  }

  constructor(
    public readonly bridgeCallData: BridgeCallData,
    public readonly partialState: Buffer,
    public readonly partialStateSecretEphPubKey: GrumpkinAddress, // the public key from which the partial state's secret may be derived (when combined with a valid account private key).
    public readonly depositValue: bigint,
    public readonly txFee: bigint,
    public readonly viewingKey: ViewingKey, // viewing key for the 'change' note
    public readonly txRefNo = 0,
  ) {
    if (partialState.length !== DataSizes.PARTIAL_STATE) {
      throw new Error('Expect partialState to be 32 bytes.');
    }
    if (viewingKey.isEmpty()) {
      throw new Error('Viewing key cannot be empty.');
    }
  }

  static fromBuffer(buf: Buffer) {
    if (buf.length !== OffchainDefiDepositData.SIZE) {
      throw new Error('Invalid buffer size.');
    }

    const bridgeCallData = BridgeCallData.fromBuffer(
      buf.slice(DataOffsets.BRIDGE_CALL_DATA, DataOffsets.BRIDGE_CALL_DATA + DataSizes.BRIDGE_CALL_DATA),
    );
    const partialState = buf.slice(DataOffsets.PARTIAL_STATE, DataOffsets.PARTIAL_STATE + DataSizes.PARTIAL_STATE);
    const partialStateSecretEphPubKey = new GrumpkinAddress(
      buf.slice(
        DataOffsets.PARTIAL_STATE_SECRET_EPH_PUB_KEY,
        DataOffsets.PARTIAL_STATE_SECRET_EPH_PUB_KEY + DataSizes.PARTIAL_STATE_SECRET_EPH_PUB_KEY,
      ),
    );
    const depositValue = toBigIntBE(
      buf.slice(DataOffsets.DEPOSIT_VALUE, DataOffsets.DEPOSIT_VALUE + DataSizes.DEPOSIT_VALUE),
    );
    const txFee = toBigIntBE(buf.slice(DataOffsets.TX_FEE, DataOffsets.TX_FEE + DataSizes.TX_FEE));
    const viewingKey = new ViewingKey(
      buf.slice(DataOffsets.VIEWING_KEY, DataOffsets.VIEWING_KEY + DataSizes.VIEWING_KEY),
    );
    const txRefNo = buf.readUInt32BE(DataOffsets.TX_REF_NO);
    return new OffchainDefiDepositData(
      bridgeCallData,
      partialState,
      partialStateSecretEphPubKey,
      depositValue,
      txFee,
      viewingKey,
      txRefNo,
    );
  }

  toBuffer() {
    return Buffer.concat([
      this.bridgeCallData.toBuffer(),
      this.partialState,
      this.partialStateSecretEphPubKey.toBuffer(),
      toBufferBE(this.depositValue, 32),
      toBufferBE(this.txFee, 32),
      this.viewingKey.toBuffer(),
      numToUInt32BE(this.txRefNo),
    ]);
  }
}
