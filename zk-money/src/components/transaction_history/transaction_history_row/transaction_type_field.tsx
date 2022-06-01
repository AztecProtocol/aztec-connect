import { ProofId, UserDefiClaimTx, UserDefiTx, UserTx } from '@aztec/sdk';
import style from './transaction_type_field.module.scss';
import { useDefiRecipes } from 'alt-model/top_level_context';
import { exitingRecipeMatcher, recipeMatcher } from 'alt-model/defi/recipe_matchers';

function getTxTypeLabel(tx: UserTx) {
  switch (tx.proofId) {
    case ProofId.DEPOSIT:
      return 'Shield';
    case ProofId.WITHDRAW:
      return 'Withdraw';
    case ProofId.SEND:
      return 'Send';
    case ProofId.ACCOUNT:
      return 'Register Account';
    case ProofId.DEFI_DEPOSIT:
      return 'Defi Deposit';
    case ProofId.DEFI_CLAIM: {
      if (tx.success) return 'Defi Claim';
      else return 'Defi Refund';
    }
  }
}

function DefiRecipeName({ tx }: { tx: UserDefiTx | UserDefiClaimTx }) {
  const recipes = useDefiRecipes();
  const recipe = recipes?.find(recipeMatcher(tx.bridgeId)) ?? recipes?.find(exitingRecipeMatcher(tx.bridgeId));
  return <>{recipe?.name}</>;
}

interface TransactionTypeFieldProps {
  tx: UserTx;
}

export function TransactionTypeField({ tx }: TransactionTypeFieldProps) {
  const isDefi = tx.proofId === ProofId.DEFI_CLAIM || tx.proofId === ProofId.DEFI_DEPOSIT;
  return (
    <div className={style.root}>
      <div className={style.top}>
        <div className={style.label}>{getTxTypeLabel(tx)}</div>
      </div>
      <div className={style.bottom}>{isDefi && <DefiRecipeName tx={tx} />}</div>
    </div>
  );
}
