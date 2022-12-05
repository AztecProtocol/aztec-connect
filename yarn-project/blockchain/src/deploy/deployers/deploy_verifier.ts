import { ContractFactory, Signer } from 'ethers';
import { MockVerifier, Verifier1x1, Verifier28x32 } from '../../abis.js';

export async function deployVerifier(signer: Signer, vk: string) {
  console.log(`Deploying ${vk}...`);
  let verifierFactory: ContractFactory;

  if (vk === 'VerificationKey1x1') {
    verifierFactory = new ContractFactory(Verifier1x1.abi, Verifier1x1.bytecode.object, signer);
  } else if (vk === 'VerificationKey28x32') {
    verifierFactory = new ContractFactory(Verifier28x32.abi, Verifier28x32.bytecode.object, signer);
  } else if (vk === 'MockVerificationKey') {
    verifierFactory = new ContractFactory(MockVerifier.abi, MockVerifier.bytecode.object, signer);
  } else {
    throw new Error('No verifier chosen');
  }
  const verifier = await verifierFactory.deploy();
  console.log(`StandardVerifier contract address: ${verifier.address}`);
  return verifier;
}
