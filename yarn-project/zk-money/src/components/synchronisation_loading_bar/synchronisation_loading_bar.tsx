import { useAccountState } from '../../alt-model/account_state/account_state_hooks.js';
import { useRollupProviderStatus } from '../../alt-model/rollup_provider_hooks.js';
import { ProgressBar } from '../../ui-components/index.js';
import style from './synchronisation_loading_bar.module.scss';

function useSynchronsationProgress() {
  const accountState = useAccountState();
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus || !accountState || rpStatus.blockchainStatus.nextRollupId < 2 || accountState.syncedToRollup < 0)
    return {
      text: 'Synchronising blocks...',
      progress: 0,
    };
  const total = rpStatus.blockchainStatus.nextRollupId - 1;
  const current = accountState.syncedToRollup;
  return {
    text: `Synchronising blocks (${current} / ${total})`,
    progress: current / total,
  };
}

export function SynchronisationLoadingBar() {
  const { text, progress } = useSynchronsationProgress();
  return (
    <div className={style.root}>
      <div className={style.text}>{text}</div>
      <ProgressBar progress={progress} className={style.bar} />
    </div>
  );
}
