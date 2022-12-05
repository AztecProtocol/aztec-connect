import { Contract, ContractFactory, Signer } from 'ethers';
import { ERC20Permit } from '../../abis.js';

const gasLimit = 5000000;

export async function deployErc20(
  rollup: Contract,
  permitHelper: Contract,
  signer: Signer,
  supportsPermit: boolean,
  symbol = 'TEST',
  decimals = 18,
) {
  console.log('Deploying ERC20 with permit support...');
  const erc20Factory = new ContractFactory(ERC20Permit.abi, ERC20Permit.bytecode, signer);
  const erc20 = await erc20Factory.deploy(symbol);
  console.log(`ERC20 contract address: ${erc20.address}`);
  if (decimals !== 18) {
    console.log(`Changing decimals to: ${decimals}...`);
    await erc20.setDecimals(decimals);
  }
  await rollup.setSupportedAsset(erc20.address, 55_000, { gasLimit });
  await permitHelper.preApprove(erc20.address, { gasLimit });
  return erc20;
}
