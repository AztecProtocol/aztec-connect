import { ProgressBar } from 'ui-components';
import { InformationSection } from '../information_section';
import style from './settlement_time_information_section.module.scss';

function SettlementProgressBar() {
  return (
    <div className={style.settlementWrapper}>
      <div className={style.title}>112 slots remaining until batch</div>
      <ProgressBar className={style.bar} progress={0.5} />
      <div className={style.text}>Pay a Fast Track or Instant fee to send the batch more quickly.</div>
    </div>
  );
}

export function SettlementTimeInformationSection() {
  return (
    <InformationSection
      title="Est Settlement"
      subtitle="~6 Hours"
      content={<SettlementProgressBar />}
      buttonLabel="Learn more"
    />
  );
}
