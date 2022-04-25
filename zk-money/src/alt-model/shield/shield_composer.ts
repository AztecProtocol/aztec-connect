import { AccountId, AztecSdk, EthAddress, DepositController } from '@aztec/sdk';
import type { Provider } from '../../app';
import createDebug from 'debug';
import { Amount } from 'alt-model/assets';
import { retryUntil, CachedStep } from 'app/util';
import { WalletAccountEnforcer } from './ensured_provider';
import { Network } from 'app/networks';
import { ShieldComposerPhase, ShieldComposerStateObs } from './shield_composer_state_obs';
import { createSigningKeys, KeyVault } from '../../app/key_vault';

const debug = createDebug('zm:shield_composer');

export interface ShieldComposerPayload {
  targetOutput: Amount;
  fee: Amount;
  depositor: EthAddress;
  recipientAlias: string;
}

export interface ShieldComposerDeps {
  sdk: AztecSdk;
  keyVault: KeyVault;
  accountId: AccountId;
  provider: Provider;
  requiredNetwork: Network;
}

export class ShieldComposer {
  stateObs = new ShieldComposerStateObs();
  private readonly walletAccountEnforcer: WalletAccountEnforcer;
  constructor(private readonly payload: ShieldComposerPayload, private readonly deps: ShieldComposerDeps) {
    this.walletAccountEnforcer = new WalletAccountEnforcer(
      deps.provider,
      payload.depositor,
      deps.requiredNetwork,
      this.stateObs.setPrompt,
    );
  }

  private readonly cachedSteps = {
    createController: new CachedStep<DepositController>(),
    deposit: new CachedStep<void>(),
    createProof: new CachedStep<void>(),
    approveProof: new CachedStep<void>(),
    sendProof: new CachedStep<void>(),
  };

  async compose() {
    this.stateObs.clearError();
    try {
      // Each step is only attempted if it hasn't already succeeded on a previous run.
      const controller = await this.cachedSteps.createController.exec(() => this.createController());
      await this.cachedSteps.createProof.exec(() => this.createProof(controller));
      await this.cachedSteps.deposit.exec(() => this.deposit(controller));
      await this.cachedSteps.approveProof.exec(() => this.approveProof(controller));
      await this.cachedSteps.sendProof.exec(() => this.sendProof(controller));
      await this.cleanup(controller);
      this.stateObs.setPhase(ShieldComposerPhase.DONE);
      return true;
    } catch (error) {
      debug('Compose failed with error:', error);
      this.stateObs.error(error?.message?.toString());
      return false;
    }
  }

  private async createController() {
    const { targetOutput, fee, depositor, recipientAlias } = this.payload;
    const { provider, sdk, keyVault, accountId } = this.deps;

    // If fees are taken in second asset we need access to the user's spending key.
    // Otherwise we can shield from nonce 0 and skip spending key generation.
    const isShieldingFromNonce0 = targetOutput.id === fee.id;

    if (isShieldingFromNonce0) {
      try {
        // We add the nonce 0 user to the sdk's store so the proof creator can check its state.
        // This feels like an unnecessary implemention quirk to me.
        await sdk.addUser(keyVault.accountPrivateKey, 0, true);
      } catch {
        // Already added
      }
    }

    const depositorAccount = isShieldingFromNonce0 ? await new AccountId(keyVault.accountPublicKey, 0) : accountId;
    const recipientAccount = await sdk.getAccountId(recipientAlias);

    if (!isShieldingFromNonce0) {
      this.stateObs.setPhase(ShieldComposerPhase.GENERATE_SPENDING_KEY);
    }
    const signerPrivateKey = isShieldingFromNonce0
      ? keyVault.accountPrivateKey
      : (await createSigningKeys(provider, sdk)).privateKey;
    const signer = await sdk.createSchnorrSigner(signerPrivateKey);

    return sdk.createDepositController(
      depositorAccount,
      signer,
      targetOutput.toAssetValue(),
      fee.toAssetValue(),
      depositor,
      recipientAccount,
      provider.ethereumProvider,
    );
  }

  private async createProof(controller: DepositController) {
    this.stateObs.setPhase(ShieldComposerPhase.CREATE_PROOF);
    await controller.createProof();
  }

  private async deposit(controller: DepositController) {
    this.stateObs.setPhase(ShieldComposerPhase.DEPOSIT);

    const requiredAmount = await this.approveAndAwaitL1AllowanceIfNecessary(controller);
    await this.depositAndAwaitConfirmation(controller, requiredAmount);
  }

  private async approveAndAwaitL1AllowanceIfNecessary(controller: DepositController) {
    // If an ERC-20 doesn't support permits, an allowance must first be granted as a seperate transaction.
    const { targetOutput } = this.payload;
    const targetAssetIsEth = targetOutput.id === 0;
    const permitSupport = targetOutput.permitSupport;
    const requiredFunds = await controller.getRequiredFunds();
    const requiredAmount = targetOutput.withBaseUnits(requiredFunds);
    if (!targetAssetIsEth && !permitSupport) {
      const sufficientAllowanceHasBeenApproved = () =>
        controller.getPublicAllowance().then(allowance => allowance >= requiredFunds);
      if (!(await sufficientAllowanceHasBeenApproved())) {
        await this.walletAccountEnforcer.ensure();
        this.stateObs.setPrompt(`Please approve a deposit of ${requiredAmount.format({ layer: 'L1' })}.`);
        await controller.approve();
        this.stateObs.setPrompt('Awaiting transaction confirmation...');
        const timeout = 1000 * 60 * 30; // 30 mins
        const interval = this.deps.requiredNetwork.isFrequent ? 1000 : 10 * 1000;
        const approved = retryUntil(sufficientAllowanceHasBeenApproved, timeout, interval);
        this.stateObs.clearPrompt();
        if (!approved) throw new Error('Failed to grant deposit allowance');
      }
    }
    return requiredAmount;
  }

  private async depositAndAwaitConfirmation(controller: DepositController, requiredAmount: Amount) {
    await this.walletAccountEnforcer.ensure();
    this.stateObs.setPrompt(`Please make a deposit of ${requiredAmount.format({ layer: 'L1' })} from your wallet.`);
    if (this.payload.targetOutput.permitSupport) {
      const expireIn = 60n * 5n; // 5 minutes
      const deadline = BigInt(Math.floor(Date.now() / 1000)) + expireIn;
      await controller.depositFundsToContractWithPermit(deadline);
    } else {
      await controller.depositFundsToContract();
    }
    this.stateObs.setPrompt('Awaiting transaction confirmation...');
    const timeout = 1000 * 60 * 30; // 30 mins
    const interval = this.deps.requiredNetwork.isFrequent ? 1000 : 10 * 1000;
    const depositHasCleared = () => controller.getRequiredFunds().then(funds => funds === 0n);
    const confirmed = retryUntil(depositHasCleared, timeout, interval);
    this.stateObs.clearPrompt();
    if (!confirmed) throw new Error('Deposit confirmation timed out');
  }

  private async approveProof(controller: DepositController) {
    const { sdk } = this.deps;
    const { depositor } = this.payload;
    // Skip this step for contract wallets
    if (!(await sdk.isContract(depositor))) {
      this.stateObs.setPhase(ShieldComposerPhase.APPROVE_PROOF);
      const signingData = await controller.getSigningData();
      const signingDataStr = signingData.toString('hex');
      const abbreviatedStr = `0x${signingDataStr.slice(0, 8)}...${signingDataStr.slice(-4)}`;
      await this.walletAccountEnforcer.ensure();
      this.stateObs.setPrompt(`Please sign the following proof data in your wallet: ${abbreviatedStr}`);
      try {
        await controller.sign();
      } catch (e) {
        debug(e);
        throw new Error('Failed to sign the proof.');
      }
      this.stateObs.clearPrompt();
    }

    if (!controller.isSignatureValid() && !(await controller.isProofApproved())) {
      await this.walletAccountEnforcer.ensure();
      this.stateObs.setPrompt('Please approve the proof data in your wallet.');
      try {
        await controller.approveProof();
      } catch (e) {
        debug(e);
        throw new Error('Failed to approve the proof.');
      }

      this.stateObs.setPrompt('Awaiting transaction confirmation...');
      const timeout = 1000 * 60 * 30;
      const interval = this.deps.requiredNetwork.isFrequent ? 1000 : 10 * 1000;
      const approved = retryUntil(() => controller.isProofApproved(), timeout, interval);
      if (!approved) throw new Error('Approval confirmation timed out');
    }
  }

  private async sendProof(controller: DepositController) {
    this.stateObs.setPhase(ShieldComposerPhase.SEND_PROOF);
    await this.walletAccountEnforcer.ensure();
    await controller.send();
  }

  private async cleanup(controller: DepositController) {
    const { userId } = controller;
    if (userId.accountNonce === 0) {
      // No longer need account nonce 0 of depositor address
      try {
        await this.deps.sdk.removeUser(controller.userId);
      } catch {
        // Already removed
      }
    }
  }
}
