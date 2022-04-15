import { ProofId, UserDefiClaimTx, UserDefiTx, UserTx } from '@aztec/sdk';
import sendIcon from 'images/tx_type_send_icon.svg';
import defiIcon from 'images/tx_type_defi_icon.svg';
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
      return 'Register';
    case ProofId.DEFI_DEPOSIT:
      return 'Defi Deposit';
    case ProofId.DEFI_CLAIM: {
      if (tx.success) return 'Defi Claim';
      else return 'Defi Refund';
    }
  }
}

function getIconSrc(proofId: ProofId) {
  switch (proofId) {
    case ProofId.SEND:
      return sendIcon;
    case ProofId.DEFI_DEPOSIT:
    case ProofId.DEFI_CLAIM:
      return defiIcon;
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
  const iconSrc = getIconSrc(tx.proofId);
  const isDefi = tx.proofId === ProofId.DEFI_CLAIM || tx.proofId === ProofId.DEFI_DEPOSIT;
  return (
    <div className={style.root}>
      <div className={style.top}>
        <div className={style.label}>{getTxTypeLabel(tx)}</div>
        {iconSrc && <img alt="" src={iconSrc} />}
      </div>
      <div className={style.bottom}>{isDefi && <DefiRecipeName tx={tx} />}</div>
    </div>
  );
}
