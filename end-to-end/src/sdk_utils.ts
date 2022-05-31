import { AssetValue, AztecSdk, EthAddress, TxSettlementTime } from '@aztec/sdk';
import { randomBytes } from 'crypto';

export async function registerUsers(
  sdk: AztecSdk,
  addresses: EthAddress[],
  depositValue: AssetValue,
  aliases: string[] = [],
) {
  const fees = await sdk.getRegisterFees(depositValue);

  const controllers = await Promise.all(
    addresses.map(async (address, i) => {
      const alias = aliases[i] || randomBytes(10).toString('hex');
      const accountKey = await sdk.generateAccountKeyPair(address);
      const spendingKey = await sdk.generateSpendingKeyPair(address);
      await sdk.addUser(accountKey.privateKey);

      // Last tx pays for instant rollup to flush.
      const fee = fees[i == addresses.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
      const controller = sdk.createRegisterController(
        accountKey.publicKey,
        alias,
        accountKey.privateKey,
        spendingKey.publicKey,
        undefined,
        depositValue,
        fee,
        address,
      );

      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();

      await controller.createProof();
      await controller.sign();

      return controller;
    }),
  );

  // Send to rollup provider, and be sure to send the "instant" one last.
  for (const controller of controllers) {
    await controller.send();
  }

  await Promise.all(controllers.map(controller => controller.awaitSettlement()));

  return controllers.map(c => c.userId);
}
