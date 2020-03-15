//const cbor          = require('cbor');
import * as vanillacbor from './vanillacbor';

export interface AuthData {
  rpIdHash: Buffer;
  counter: number;
  flags: {
    up: boolean;
    uv: boolean;
    at: boolean;
    ed: boolean;
    flagsInt: number;
  };
  counterBuffer: Buffer;
  aaguid: string | undefined;
  credIdBuffer: Buffer | undefined;
  cosePublicKeyBuffer: Buffer | undefined;
  coseExtensionsDataBuffer: Buffer | undefined;
}

export function parseAuthData(buffer: Buffer): AuthData {
  if (buffer.byteLength < 37) throw new Error('Authenticator Data must be at least 37 bytes long!');

  let rpIdHash = buffer.slice(0, 32);
  buffer = buffer.slice(32);

  /* Flags */
  let flagsBuffer = buffer.slice(0, 1);
  buffer = buffer.slice(1);
  let flagsInt = flagsBuffer[0];
  let up = !!(flagsInt & 0x01); // Test of User Presence
  let uv = !!(flagsInt & 0x04); // User Verification
  let at = !!(flagsInt & 0x40); // Attestation data
  let ed = !!(flagsInt & 0x80); // Extension data
  let flags = { up, uv, at, ed, flagsInt };

  let counterBuffer = buffer.slice(0, 4);
  buffer = buffer.slice(4);
  let counter = counterBuffer.readUInt32BE(0);

  /* Attested credential data */
  let aaguid = undefined;
  let aaguidBuffer = undefined;
  let credIdBuffer = undefined;
  let cosePublicKeyBuffer = undefined;
  let attestationMinLen = 16 + 2 + 16 + 77; // aaguid + credIdLen + credId + pk

  if (at) {
    // Attested Data
    if (buffer.byteLength < attestationMinLen)
      throw new Error(
        `It seems as the Attestation Data flag is set, but the remaining data is smaller than ${attestationMinLen} bytes. You might have set AT flag for the assertion response.`
      );

    aaguid = buffer.slice(0, 16).toString('hex');
    buffer = buffer.slice(16);
    aaguidBuffer = `${aaguid.slice(0, 8)}-${aaguid.slice(8, 12)}-${aaguid.slice(12, 16)}-${aaguid.slice(
      16,
      20
    )}-${aaguid.slice(20)}`;

    let credIdLenBuffer = buffer.slice(0, 2);
    buffer = buffer.slice(2);
    let credIdLen = credIdLenBuffer.readUInt16BE(0);
    credIdBuffer = buffer.slice(0, credIdLen);
    buffer = buffer.slice(credIdLen);

    let pubKeyLength = vanillacbor.decodeOnlyFirst(buffer).byteLength;
    cosePublicKeyBuffer = buffer.slice(0, pubKeyLength);
    buffer = buffer.slice(pubKeyLength);
  }

  let coseExtensionsDataBuffer = undefined;
  if (ed) {
    // Extension Data
    let extensionsDataLength = vanillacbor.decodeOnlyFirst(buffer).byteLength;

    coseExtensionsDataBuffer = buffer.slice(0, extensionsDataLength);
    buffer = buffer.slice(extensionsDataLength);
  }

  if (buffer.byteLength) throw new Error('Failed to decode authData! Leftover bytes been detected!');

  return {
    rpIdHash,
    counter,
    flags,
    counterBuffer,
    aaguid,
    credIdBuffer,
    cosePublicKeyBuffer,
    coseExtensionsDataBuffer,
  };
}
