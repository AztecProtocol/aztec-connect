import { ContractFactory, Signer } from 'ethers';
import StandardVerifier from '../artifacts/contracts/verifier/StandardVerifier.sol/StandardVerifier.json';
import StandardVerificationKeys from '../artifacts/contracts/verifier/keys/StandardVerificationKeys.sol/StandardVerificationKeys.json';

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

export async function deployStandardVerifier(signer: Signer) {
  console.error('Deploying StandardVerificationKeys...');
  const StandardverificationKeysLibrary = new ContractFactory(StandardVerificationKeys.abi, StandardVerificationKeys.bytecode, signer);
  const StandardverificationKeysLib = await StandardverificationKeysLibrary.deploy();

  console.error('Deploying StandardVerifier...');
  const linkedVBytecode = linkBytecode(StandardVerifier, {
    StandardVerificationKeys: StandardverificationKeysLib.address,
  });
  const verifierFactory = new ContractFactory(StandardVerifier.abi, linkedVBytecode, signer);
  const verifier = await verifierFactory.deploy();
  return verifier;
}
