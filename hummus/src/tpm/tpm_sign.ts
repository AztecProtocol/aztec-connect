import { parseAuthData, AuthData } from './parse_auth_data';
import * as cbor from 'cbor';
import { createHash, createVerify } from 'crypto';

async function makeCred(): Promise<AuthData> {
  const id = Uint8Array.from(window.atob('MIIBkzCCATigAwIBAjCCAZMwggE4oAMCAQIwggGTMII='), c => c.charCodeAt(0));
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,

    rp: {
      name: 'AZTEC',
    },

    user: {
      id,
      name: 'charlie',
      displayName: 'Charlie',
    },

    authenticatorSelection: { userVerification: 'required' },

    attestation: 'none',

    pubKeyCredParams: [
      {
        type: 'public-key',
        alg: -7, // "ES256" IANA COSE Algorithms registry
      },
      {
        type: 'public-key',
        alg: -257, // "RS256" IANA COSE Algorithms registry
      },
    ],
  };

  const newCredentialInfo = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  const attestationResponse = newCredentialInfo.response as AuthenticatorAttestationResponse;

  console.log(attestationResponse);
  // let attestationObjectBuffer = window.atob(attestationResponse.attestationObject);
  let ctapMakeCredResp = cbor.decodeAllSync(Buffer.from(attestationResponse.attestationObject))[0];
  console.log(ctapMakeCredResp);

  return parseAuthData(ctapMakeCredResp.authData);
}

async function sign(credentialId: Buffer, challenge: Buffer) {
  var publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{ type: 'public-key', id: credentialId }],
    userVerification: 'required',
  };

  const getAssertionResponse = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential;
  return getAssertionResponse.response as AuthenticatorAssertionResponse;
}

interface Creds {
  counter: number;
  credId: Buffer;
  pubKey: Buffer;
}

function COSEECDHAtoPKCS(COSEPublicKey: Buffer) {
  const coseStruct = cbor.decodeAllSync(COSEPublicKey)[0];
  const tag = Buffer.from([0x04]);
  const x = coseStruct.get(-2);
  const y = coseStruct.get(-3);

  return Buffer.concat([tag, x, y]);
}

export async function doTheThings() {
  const existingCreds = window.localStorage.getItem('creds');
  let creds: Creds;
  if (!existingCreds) {
    const parsedAuthData = await makeCred();
    console.log(parsedAuthData);
    const pubKey = COSEECDHAtoPKCS(parsedAuthData.cosePublicKeyBuffer!);

    // Store counter, credId, and pub key.
    creds = {
      counter: parsedAuthData.counter,
      credId: parsedAuthData.credIdBuffer!,
      pubKey,
    };
    const toStore = {
      counter: parsedAuthData.counter,
      credId: parsedAuthData.credIdBuffer!.toString('base64'),
      pubKey: pubKey.toString('base64'),
    };
    window.localStorage.setItem('creds', JSON.stringify(toStore));
  } else {
    const { counter, credId, pubKey } = JSON.parse(existingCreds);
    creds = {
      counter,
      credId: Buffer.from(credId, 'base64'),
      pubKey: Buffer.from(pubKey, 'base64'),
    };
  }

  console.log('Creds', creds);

  const challenge = Buffer.from('the note data we want to sign');
  const signResponse = await sign(creds.credId, challenge);
  console.log(signResponse);

  const clientDataJsonStr = new TextDecoder('utf-8').decode(signResponse.clientDataJSON);
  console.log(clientDataJsonStr);
  console.log('client json length: ', clientDataJsonStr.length);

  const clientDataJson = JSON.parse(clientDataJsonStr);
  console.log(clientDataJson);
  if (!challenge.equals(Buffer.from(clientDataJson.challenge, 'base64'))) {
    throw 'Challenge unequal.';
  }
  if (clientDataJson.origin != window.location.origin) {
    throw 'Origin unequal.';
  }
  if (clientDataJson.type != 'webauthn.get') {
    throw 'Type unequal.';
  }

  const authDataBuf = Buffer.from(signResponse.authenticatorData);
  const authData = parseAuthData(authDataBuf);
  console.log('auth data', authData);

  if (!authData.flags.up) {
    throw new Error('User was not presented during authentication!');
  }

  if (!authData.flags.uv) {
    throw new Error('User was not verified during authentication!');
  }

  const clientDataHash = createHash('sha256')
    .update(clientDataJsonStr)
    .digest();
  const signatureBase = Buffer.concat([authDataBuf, clientDataHash]);
  const publicKey = ASN1toPEM(creds.pubKey);
  console.log(publicKey);
  console.log('length of message: ', signatureBase.length);

  const verified = createVerify('sha256')
    .update(signatureBase)
    .verify(publicKey, Buffer.from(signResponse.signature));

  console.log(verified);
}

function ASN1toPEM(pkBuffer: Buffer) {
  let type;
  if (pkBuffer.length == 65 && pkBuffer[0] == 0x04) {
    pkBuffer = Buffer.concat([Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex'), pkBuffer]);

    type = 'PUBLIC KEY';
  } else {
    type = 'CERTIFICATE';
  }

  const b64cert = pkBuffer.toString('base64');

  let PEMKey = '';
  for (let i = 0; i < Math.ceil(b64cert.length / 64); i++) {
    const start = 64 * i;
    PEMKey += b64cert.substr(start, 64) + '\n';
  }

  PEMKey = `-----BEGIN ${type}-----\n` + PEMKey + `-----END ${type}-----\n`;
  return PEMKey;
}
