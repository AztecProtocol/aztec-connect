import { ContractFactory, Signer } from 'ethers';
import PolynomialEval from '../artifacts/PolynomialEval.json';
import TranscriptLibrary from '../artifacts/TranscriptLibrary.json';
import TurboPlonk from '../artifacts/TurboPlonk.json';
import TurboVerifier from '../artifacts/TurboVerifier.json';
import VerificationKeys from '../artifacts/VerificationKeys.json';

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
  console.error('Deploying TranscriptLibrary...');
  const linkedTBytecode = linkBytecode(TranscriptLibrary, {});
  const transcriptLibraryFactory = new ContractFactory(TranscriptLibrary.abi, linkedTBytecode, signer);
  const transcriptLib = await transcriptLibraryFactory.deploy();

  console.error('Deploying PolynomialEvalLibrary...');
  const linkedPBytecode = linkBytecode(PolynomialEval, {});
  const polynomialEvalLibFactory = new ContractFactory(PolynomialEval.abi, linkedPBytecode, signer);
  const polynomialEvalLib = await polynomialEvalLibFactory.deploy();

  console.error('Deploying VerificationKeys...');
  const verificationKeysLibrary = new ContractFactory(VerificationKeys.abi, VerificationKeys.bytecode, signer);
  const verificationKeysLib = await verificationKeysLibrary.deploy();

  console.error('Deploying TurboPlonk...');
  const linkedTPBytecode = linkBytecode(TurboPlonk, {
    TranscriptLibrary: transcriptLib.address,
    PolynomialEval: polynomialEvalLib.address,
  });
  const turboPlonkFactory = new ContractFactory(TurboPlonk.abi, linkedTPBytecode, signer);
  const turboPlonkLib = await turboPlonkFactory.deploy();

  console.error('Deploying TurboVerifier...');
  const linkedVBytecode = linkBytecode(TurboVerifier, {
    TranscriptLibrary: transcriptLib.address,
    PolynomialEval: polynomialEvalLib.address,
    TurboPlonk: turboPlonkLib.address,
    VerificationKeys: verificationKeysLib.address,
  });
  const verifierFactory = new ContractFactory(TurboVerifier.abi, linkedVBytecode, signer);
  const verifier = await verifierFactory.deploy();
  return verifier;
}
