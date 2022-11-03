import { AssetValue, AztecSdk, EthAddress, TxSettlementTime, randomBytes } from '@aztec/sdk';

export async function registerUsers(
  sdk: AztecSdk,
  addresses: EthAddress[],
  depositValue: AssetValue,
  aliases: string[] = [],
) {
  const fees = await sdk.getRegisterFees(depositValue.assetId);

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

export async function addUsers(
  sdk: AztecSdk,
  addresses: EthAddress[],
  depositValue?: AssetValue,
  ...depositors: EthAddress[]
) {
  const accounts = await Promise.all(addresses.map(address => sdk.generateAccountKeyPair(address)));
  const userIds = await Promise.all(accounts.map(async account => (await sdk.addUser(account.privateKey)).id));
  const signers = await Promise.all(accounts.map(account => sdk.createSchnorrSigner(account.privateKey)));

  if (depositValue) {
    if (!depositors.length) {
      throw new Error('Depositor undefined.');
    }

    const fees = await sdk.getDepositFees(depositValue.assetId);

    const controllers = await Promise.all(
      userIds.map(async (userId, i) => {
        // Last tx pays for instant rollup to flush.
        const fee = fees[i == userIds.length - 1 ? TxSettlementTime.INSTANT : TxSettlementTime.NEXT_ROLLUP];
        const controller = sdk.createDepositController(depositors[i] || depositors[0], depositValue, fee, userId);

        await controller.createProof();
        await controller.sign();

        return controller;
      }),
    );

    // Send to rollup provider, and be sure to send the "instant" one last.
    for (const controller of controllers) {
      await controller.depositFundsToContract();
      await controller.awaitDepositFundsToContract();
      await controller.send();
    }

    await Promise.all(controllers.map(controller => controller.awaitSettlement()));
  }

  return { userIds, signers };
}
