import { BridgeCountDown } from 'features/defi/bridge_count_down';
import style from './progress_section.module.scss';

export function ProgressSection() {
  return (
    <div className={style.progressSection}>
      <BridgeCountDown totalSlots={24} takenSlots={12} nextBatch={new Date(Date.now() + 1000 * 60 * 22)} />
    </div>
  );
}
