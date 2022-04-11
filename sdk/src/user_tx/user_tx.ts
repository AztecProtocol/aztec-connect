import { UserAccountTx } from './user_account_tx';
import { UserDefiTx } from './user_defi_tx';
import { UserDefiClaimTx } from './user_defi_claim_tx';
import { UserPaymentTx } from './user_payment_tx';

export type UserTx = UserAccountTx | UserDefiTx | UserDefiClaimTx | UserPaymentTx;
