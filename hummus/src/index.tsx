/*
  Copyright (c) 2019 Spilsbury Holdings

  This file is part of web3x and is released under the MIT License.
  https://opensource.org/licenses/MIT
*/

import React from 'react';
import ReactDOM from 'react-dom';
import { BarretenbergWasm } from 'barretenberg/wasm';
import { Schnorr } from 'barretenberg/crypto/schnorr';
import { parseAuthData, AuthData } from './parseAuthData';
import * as cbor from 'cbor';
import { createHash } from 'crypto';
require('barretenberg/wasm/barretenberg.wasm');

async function signAThing() {
  const barretenberg = new BarretenbergWasm();
  await barretenberg.init();
  const schnorr = new Schnorr(barretenberg);

  const pk = Buffer.from([
    0x0b, 0x9b, 0x3a, 0xde, 0xe6, 0xb3, 0xd8, 0x1b, 0x28, 0xa0, 0x88, 0x6b, 0x2a, 0x84, 0x15, 0xc7,
    0xda, 0x31, 0x29, 0x1a, 0x5e, 0x96, 0xbb, 0x7a, 0x56, 0x63, 0x9e, 0x17, 0x7d, 0x30, 0x1b, 0xeb ]);

  const pubKey = schnorr.computePublicKey(pk);
  const msg = new TextEncoder().encode('The quick brown dog jumped over the lazy fox.');
  const signature = schnorr.constructSignature(msg, pk);
  const verified = schnorr.verifySignature(msg, pubKey, signature);

  console.log(verified);

  return verified
}

async function makeCred(): Promise<AuthData> {
  const id = Uint8Array.from(window.atob("MIIBkzCCATigAwIBAjCCAZMwggE4oAMCAQIwggGTMII="), c=>c.charCodeAt(0));
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,

    rp: {
        name: "AZTEC"
    },

    user: {
        id,
        name: "charlie",
        displayName: "Charlie"
    },

    authenticatorSelection: {userVerification : 'required'},

    attestation: "none",

    pubKeyCredParams: [
        {
            type: "public-key", alg: -7 // "ES256" IANA COSE Algorithms registry
        },
        {
            type: "public-key", alg: -257 // "RS256" IANA COSE Algorithms registry
        }
    ]
  }

  const newCredentialInfo = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
  const attestationResponse = newCredentialInfo.response as AuthenticatorAttestationResponse;

  console.log(attestationResponse);
  // let attestationObjectBuffer = window.atob(attestationResponse.attestationObject);
  let ctapMakeCredResp        = cbor.decodeAllSync(Buffer.from(attestationResponse.attestationObject))[0];
  console.log(ctapMakeCredResp);

  return parseAuthData(ctapMakeCredResp.authData);
}

async function sign(credentialId: Buffer, challenge: Buffer) {
  var publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
        { type: "public-key", id: credentialId }
    ],
    userVerification : 'required',
  }

  const getAssertionResponse = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
  return getAssertionResponse.response as AuthenticatorAssertionResponse;
}

interface Creds {
  counter: number;
  credId: Buffer;
  pubKey: Buffer;
};

function toHexString(byteArray: Uint8Array) {
  return Array.prototype.map.call(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}
function toByteArray(hexString: string) {
  var result = [];
  for (var i = 0; i < hexString.length; i += 2) {
    result.push(parseInt(hexString.substr(i, 2), 16));
  }
  return result;
}

async function doTheThings() {
  const existingCreds = window.localStorage.getItem('creds');
  let creds: Creds;
  if (!existingCreds) {
    const parsedAuthData = await makeCred();
    console.log(parsedAuthData);

    // Store counter, credId, and pub key.
    creds = {
      counter: parsedAuthData.counter,
      credId: parsedAuthData.credIdBuffer!,
      pubKey: parsedAuthData.cosePublicKeyBuffer!,
    };
    const toStore = {
      counter: parsedAuthData.counter,
      credId: parsedAuthData.credIdBuffer!.toString('base64'),
      pubKey: parsedAuthData.cosePublicKeyBuffer!.toString('base64'),
    }
    window.localStorage.setItem("creds", JSON.stringify(toStore))
  } else {
    const { counter, credId, pubKey } = JSON.parse(existingCreds);
    creds = {
      counter,
      credId: Buffer.from(credId, 'base64'),
      pubKey: Buffer.from(pubKey, 'base64'),
    }
  }

  console.log("Creds", creds);

  const challenge = Buffer.from("the note data we want to sign");
  const signResponse = await sign(creds.credId, challenge);
  console.log(signResponse);

  const clientDataJson = JSON.parse(new TextDecoder("utf-8").decode(signResponse.clientDataJSON));
  console.log(clientDataJson);
  if (!challenge.equals(Buffer.from(clientDataJson.challenge, 'base64'))) {
    throw "Challenge unequal.";
  }
  if (clientDataJson.origin != window.location.origin) {
    throw "Origin unequal.";
  }
  if (clientDataJson.type != "webauthn.get") {
    throw "Type unequal.";
  }

  const authData = Buffer.from(signResponse.authenticatorData);
  console.log("auth data", parseAuthData(authData));

  const clientDataHash = createHash('sha256').update('alice', 'utf8').digest();
  const signatureBase = Buffer.concat([authData, clientDataHash]);
}

function LandingPage(props: any) {
  return (
    <form>
      <label>Press the button: </label><input type="button" value="The Button" onClick={doTheThings}></input>
    </form>
  );
}

async function main() {
  ReactDOM.render(<LandingPage />, document.getElementById('root'));
}

// tslint:disable-next-line:no-console
main().catch(console.error);
