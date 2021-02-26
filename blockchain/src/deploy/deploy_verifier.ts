import { ContractFactory, Signer } from 'ethers';
import TurboVerifier from '../artifacts/contracts/verifier/TurboVerifier.sol/TurboVerifier.json';
import VerificationKeys from '../artifacts/contracts/verifier/keys/VerificationKeys.sol/VerificationKeys.json';

function linkBytecode(artifact: any, libraries: any) {
  let bytecode = artifact.bytecode;
  for (const entry of Object.entries(artifact.linkReferences)) {
    const [, fileReferences]: any = entry;
    for (const fileEntry of Object.entries(fileReferences)) {
      const [libName, fixups]: any = fileEntry;
      const addr = libraries[libName];
      if (addr === undefined) {
        continue;
      }

      for (const fixup of fixups) {
        bytecode =
          bytecode.substr(0, 2 + fixup.start * 2) +
          addr.substr(2) +
          bytecode.substr(2 + (fixup.start + fixup.length) * 2);
      }
    }
  }

  return bytecode;
}

export async function deployVerifier(signer: Signer) {
  console.error('Deploying VerificationKeys...');
  const verificationKeysLibrary = new ContractFactory(VerificationKeys.abi, VerificationKeys.bytecode, signer);
  const verificationKeysLib = await verificationKeysLibrary.deploy();

  console.error('Deploying TurboVerifier...');
  const linkedVBytecode = linkBytecode(TurboVerifier, {
    VerificationKeys: verificationKeysLib.address,
  });
  const verifierFactory = new ContractFactory(TurboVerifier.abi, linkedVBytecode, signer);
  const verifier = await verifierFactory.deploy();
  return verifier;
}
