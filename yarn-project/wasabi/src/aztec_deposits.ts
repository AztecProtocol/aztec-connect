import { AztecSdk, WalletProvider, EthAddress, AztecSdkUser, TxSettlementTime } from '@aztec/sdk';

async function sendDeposit(
  sdk: AztecSdk,
  numAgents: number,
  tx: number,
  account: number,
  processAddress: EthAddress,
  user: AztecSdkUser,
) {
  const depositFee = (await sdk.getDepositFees(0))[TxSettlementTime.NEXT_ROLLUP];
  console.log(`creating deposit ${tx + numAgents * (account! - 1)}, with fee: ${depositFee.value}`);
  const controller = sdk.createDepositController(processAddress, { assetId: 0, value: 1n }, depositFee, user.id, false);

  await controller.createProof();
  await controller.sign();
  await controller.send();
  console.log(`sent deposit ${tx + numAgents * (account! - 1)}`);
}

export async function sendAztecDeposits(
  sdk: AztecSdk,
  processAddress: EthAddress,
  depositAmount: bigint,
  provider: WalletProvider,
  numAgents: number,
  account: number,
) {
  const amountOnContract = await sdk.getUserPendingDeposit(0, processAddress);
  const difference = depositAmount - amountOnContract;
  if (difference > 0) {
    console.log(`depositing ${difference} to contract`);
    const txHash = await sdk.depositFundsToContract({ assetId: 0, value: difference }, processAddress);
    const receipt = await sdk.getTransactionReceipt(txHash);
    console.log(`deposit to contract result: ${receipt.status}`);
    while (true) {
      const pendingBalance = await sdk.getUserPendingDeposit(0, processAddress);
      if (pendingBalance >= depositAmount) {
        console.log(`contract pending deposit sufficient: ${pendingBalance}`);
        break;
      }
      console.log(
        `waiting for pending deposit. amount on contract: ${pendingBalance}, amount deposited: ${depositAmount}`,
      );
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  } else {
    console.log(`no need to deposit to contract, balance: ${amountOnContract}, amount required: ${depositAmount}`);
  }

  const privateKey = provider.getPrivateKeyForAddress(processAddress);
  const publicKey = await sdk.derivePublicKey(privateKey!);
  const userExists = await sdk.userExists(publicKey);
  const user = !userExists ? await sdk.addUser(privateKey!, true) : await sdk.getUser(publicKey);
  await user.awaitSynchronised();
  console.log('SDK Ready!!');

  for (let i = 0; i < numAgents; i++) {
    while (true) {
      try {
        await sendDeposit(sdk, numAgents, i, account!, processAddress, user);
        break;
      } catch (err) {
        console.log(err);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}
