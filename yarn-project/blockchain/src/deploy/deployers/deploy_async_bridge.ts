import { Contract, ContractFactory, Signer, utils } from 'ethers';
import { AsyncBridge, ERC20Mintable } from '../../abis.js';

const gasLimit = 5000000;
const outputValueA = 257 * 10 ** 12;

export const deployAsyncBridge = async (owner: Signer, rollup: Contract, outputToken: Contract) => {
  console.log('Deploying AsyncBridge...');
  const factory = new ContractFactory(AsyncBridge.abi, AsyncBridge.bytecode, owner);
  const bridge = await factory.deploy({
    gasLimit,
  });

  console.log(`AsyncBridge contract address: ${bridge.address}`);

  await rollup.setSupportedBridge(bridge.address, 200000n, { gasLimit });

  // Set action on the bridge
  const iface = new utils.Interface(ERC20Mintable.abi);
  const approveCallData = iface.encodeFunctionData('approve', [rollup.address, outputValueA]);
  const subAction = [outputToken.address, 0, approveCallData];

  const action = [outputValueA, 0, true, [subAction]];

  const actionTxPromise = bridge.setAction(action);

  const actionTxReceipt = await owner.provider?.getTransactionReceipt((await actionTxPromise).hash);

  if (actionTxReceipt && actionTxReceipt.status === 1) {
    console.log(`AsyncBridge action successfully set in ${actionTxReceipt.transactionHash}`);
    const action = await bridge.action();
    console.log(`Action outputA ${action.outputA}`);
    console.log(`Action outputB ${action.outputB}`);
  } else {
    console.log('Setting AsyncBridge action failed');
  }

  // Mint outputValueA of outputToken to the bridge
  const mintTxPromise = outputToken.mint(bridge.address, outputValueA);
  const txReceiptMint = await owner.provider?.getTransactionReceipt((await mintTxPromise).hash);

  if (txReceiptMint && txReceiptMint.status === 1) {
    console.log(`Minting output token to the bridge succeeded in ${txReceiptMint.transactionHash}`);
    const bridgeOutputTokenBalance = await outputToken.balanceOf(bridge.address);
    console.log(`Bridge balance ${bridgeOutputTokenBalance}`);
  } else {
    console.log('Minting output token to the bridge failed');
  }

  return bridge;
};
