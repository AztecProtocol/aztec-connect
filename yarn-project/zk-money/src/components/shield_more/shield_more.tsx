import { useAccountStateManager } from '../../alt-model/top_level_context/top_level_context_hooks.js';
import { useWalletInteractionIsOngoing } from '../../alt-model/wallet_interaction_hooks.js';
import { useObs } from '../../app/util/index.js';
import { Button, CardWrapper } from '../../ui-components/index.js';
import style from './shield_more.module.scss';

interface ShieldMoreProps {
  onOpenShieldModal(): void;
}

export function ShieldMore(props: ShieldMoreProps) {
  const walletInteractionIsOngoing = useWalletInteractionIsOngoing();
  const accountStateManager = useAccountStateManager();
  const accountState = useObs(accountStateManager.stateObs);
  const isSynced = accountState && !accountState.isSyncing;

  return (
    <>
      <CardWrapper className={style.shieldMoreWrapper}>
        <div className={style.shieldMoreLabel}>Shield additional funds from L1</div>
        <Button
          disabled={walletInteractionIsOngoing || !isSynced}
          className={style.shieldMoreButton}
          text="Shield More"
          onClick={() => props.onOpenShieldModal()}
        />
      </CardWrapper>
    </>
  );
}
