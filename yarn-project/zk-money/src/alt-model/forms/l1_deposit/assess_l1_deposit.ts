import { hasIssues } from '../helpers.js';
import { AssessL1DepositBalancesResources, assessL1DepositBalances } from './assess_l1_deposit_balances.js';
import { AssessL1DepositWalletResources, assessL1DepositConnectedWallet } from './assess_l1_deposit_connect_wallet.js';

export type L1DepositResources = AssessL1DepositBalancesResources & AssessL1DepositWalletResources;

export function assessL1Deposit(resources: L1DepositResources) {
  const balances = assessL1DepositBalances(resources);
  const connectedWallet = assessL1DepositConnectedWallet(resources);
  const isValid = !hasIssues(balances) && !hasIssues(connectedWallet);
  return { balances, connectedWallet, isValid };
}

export type L1DepositAssessment = ReturnType<typeof assessL1Deposit>;
