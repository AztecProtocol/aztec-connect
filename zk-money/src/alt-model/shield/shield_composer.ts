import { AccountId, AztecSdk, EthAddress, DepositController, TxId, FeePayer } from '@aztec/sdk';
import type { Provider } from '../../app';
import createDebug from 'debug';
import { Amount } from 'alt-model/assets';
import { retryUntil, CachedStep } from 'app/util';
import { WalletAccountEnforcer } from './ensured_provider';
import { Network } from 'app/networks';
import { ShieldComposerPhase, ShieldComposerStateObs } from './shield_composer_state_obs';
import { createSigningKeys, KeyVault } from '../../app/key_vault';
import { KNOWN_MAINNET_ASSET_ADDRESSES } from 'alt-model/known_assets/known_asset_addresses';

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
    sendProof: new CachedStep<TxId>(),
  };

  async compose() {
    this.stateObs.clearError();
    try {
      // Each step is only attempted if it hasn't already succeeded on a previous run.
      const controller = await this.cachedSteps.createController.exec(() => this.createController());
      await this.cachedSteps.createProof.exec(() => this.createProof(controller));
      await this.cachedSteps.deposit.exec(() => this.deposit(controller));
      await this.cachedSteps.approveProof.exec(() => this.approveProof(controller));
      const txId = await this.cachedSteps.sendProof.exec(() => this.sendProof(controller));
      this.stateObs.setPhase(ShieldComposerPhase.DONE);

      return txId;
    } catch (error) {
      debug('Compose failed with error:', error);
      this.stateObs.error(error?.message?.toString());
      return false;
    }
  }

  private async createController() {
    const { targetOutput, fee, depositor, recipientAlias } = this.payload;
    const { provider, sdk, accountId } = this.deps;
    const recipientAccount = (await sdk.getRemoteAccountId(recipientAlias))!;

    // If fees are taken in second asset we need access to the user's spending key.
    // Otherwise we can shield from nonce 0 and skip spending key generation.
    let feePayer: FeePayer | undefined;
    const isShieldingFromNonce0 = targetOutput.id === fee.id;
    if (!isShieldingFromNonce0) {
      this.stateObs.setPhase(ShieldComposerPhase.GENERATE_SPENDING_KEY);
      const signerPrivateKey = (await createSigningKeys(provider, sdk)).privateKey;
      const signer = await sdk.createSchnorrSigner(signerPrivateKey);
      feePayer = { userId: accountId, signer };
    }

    return sdk.createDepositController(
      depositor,
      targetOutput.toAssetValue(),
      fee.toAssetValue(),
      recipientAccount,
      feePayer,
      provider.ethereumProvider,
    );
  }

  private async createProof(controller: DepositController) {
    this.stateObs.setPhase(ShieldComposerPhase.CREATE_PROOF);
    await controller.createProof();
  }

  private async deposit(controller: DepositController) {
    this.stateObs.setPhase(ShieldComposerPhase.DEPOSIT);

    const requiredFunds = await controller.getRequiredFunds();
    if (requiredFunds === 0n) {
      // Already enough funds pending on contract
      return;
    }
    const requiredAmount = this.payload.targetOutput.withBaseUnits(requiredFunds);
    await this.approveAndAwaitL1AllowanceIfNecessary(controller, requiredAmount);
    await this.depositAndAwaitConfirmation(controller, requiredAmount);
  }

  private async approveAndAwaitL1AllowanceIfNecessary(controller: DepositController, requiredAmount: Amount) {
    // If an ERC-20 doesn't support permits, an allowance must first be granted as a seperate transaction.
    const targetAssetIsEth = controller.assetValue.assetId === 0;
    if (!targetAssetIsEth && !controller.hasPermitSupport()) {
      const sufficientAllowanceHasBeenApproved = () =>
        controller.getPublicAllowance().then(allowance => allowance >= requiredAmount.baseUnits);
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
    const expireIn = 60n * 5n; // 5 minutes
    const deadline = BigInt(Math.floor(Date.now() / 1000)) + expireIn;
    const isDai = this.payload.targetOutput.id === this.deps.sdk.getAssetIdByAddress(KNOWN_MAINNET_ASSET_ADDRESSES.DAI);
    if (isDai) {
      await controller.depositFundsToContractWithNonStandardPermit(deadline);
    } else {
      await controller.depositFundsToContract(deadline);
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
      const digest = controller.getProofHash()?.toString('hex');
      if (!digest) throw new Error('Proof digest unavailable');
      await this.walletAccountEnforcer.ensure();
      this.stateObs.setPrompt(
        `Please sign the message in your wallet containing the following transaction ID: ${digest}`,
      );
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
    return await controller.send();
  }
}
