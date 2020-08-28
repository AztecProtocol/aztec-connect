import { ContractFactory, Signer } from 'ethers';
import PolynomialEval from '../artifacts/PolynomialEval.json';
import Rollup1Vk from '../artifacts/Rollup1Vk.json';
import Rollup2Vk from '../artifacts/Rollup2Vk.json';
import TranscriptLibrary from '../artifacts/TranscriptLibrary.json';
import TurboPlonk from '../artifacts/TurboPlonk.json';
import TurboVerifier from '../artifacts/TurboVerifier.json';
import VerificationKeys from '../artifacts/VerificationKeys.json';

function linkBytecode(artifact: any, libraries: any) {
  let bytecode = artifact.bytecode;
  for (const entry of Object.entries(artifact.linkReferences)) {
    const [fileName, fileReferences]: any = entry;
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
  const linkedTBytecode = linkBytecode(TranscriptLibrary, {});

  const transcriptLibraryFactory = new ContractFactory(TranscriptLibrary.abi, linkedTBytecode, signer);
  const transcriptLib = await transcriptLibraryFactory.deploy();

  const linkedPBytecode = linkBytecode(PolynomialEval, {});

  const polynomialEvalLibFactory = new ContractFactory(PolynomialEval.abi, linkedPBytecode, signer);
  const polynomialEvalLib = await polynomialEvalLibFactory.deploy();

  const rollupVk1LibFactory = new ContractFactory(Rollup1Vk.abi, Rollup1Vk.bytecode, signer);
  const rollupVk1Lib = await rollupVk1LibFactory.deploy();

  const rollupVk2LibFactory = new ContractFactory(Rollup2Vk.abi, Rollup2Vk.bytecode, signer);
  const rollupVk2Lib = await rollupVk2LibFactory.deploy();

  const linkedVerificationKeyBytecode = linkBytecode(VerificationKeys, {
    Rollup1Vk: rollupVk1Lib.address,
    Rollup2Vk: rollupVk2Lib.address,
  });

  const verificationKeysLibrary = new ContractFactory(VerificationKeys.abi, linkedVerificationKeyBytecode, signer);
  const verificationKeysLib = await verificationKeysLibrary.deploy();

  const linkedTPBytecode = linkBytecode(TurboPlonk, {
    TranscriptLibrary: transcriptLib.address,
    PolynomialEval: polynomialEvalLib.address,
  });

  const turboPlonkFactory = new ContractFactory(TurboPlonk.abi, linkedTPBytecode, signer);

  const turboPlonkLib = await turboPlonkFactory.deploy();

  const linkedVBytecode = linkBytecode(TurboVerifier, {
    TranscriptLibrary: transcriptLib.address,
    PolynomialEval: polynomialEvalLib.address,
    TurboPlonk: turboPlonkLib.address,
    VerificationKeys: verificationKeysLib.address,
  });

  const verifierFactory = new ContractFactory(TurboVerifier.abi, linkedVBytecode, signer);
  return await verifierFactory.deploy();
}
