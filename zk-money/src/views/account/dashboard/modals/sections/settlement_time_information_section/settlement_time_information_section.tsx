import moment from 'moment';
import { ProgressBar } from 'ui-components';
import { DefiRecipe } from 'alt-model/defi/types';
import { InformationSection } from '../information_section';
import { useDefaultCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import style from './settlement_time_information_section.module.scss';

interface SettlementTimeInformationSectionProps {
  recipe: DefiRecipe;
}

interface SettlementProgressBarProps {
  remainingSlots: number;
  progress: number;
}

function SettlementProgressBar(props: SettlementProgressBarProps) {
  return (
    <div className={style.settlementWrapper}>
      <div className={style.title}>{props.remainingSlots} slots remaining until batch</div>
      <ProgressBar className={style.bar} progress={props.progress} />
      <div className={style.text}>Pay a Fast Track or Instant fee to send the batch more quickly.</div>
    </div>
  );
}

export function SettlementTimeInformationSection(props: SettlementTimeInformationSectionProps) {
  const data = useDefaultCountDownData(props.recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = (data?.totalSlots ?? 0) - (data?.takenSlots ?? 0);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(true) : '';

  return (
    <InformationSection
      title="Est Settlement"
      subtitle={timeStr}
      content={<SettlementProgressBar remainingSlots={remainingSlots} progress={progress} />}
      buttonLabel="Learn more"
    />
  );
}
