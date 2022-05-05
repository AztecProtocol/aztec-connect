import moment from 'moment';
import { ProgressBar } from 'ui-components';
import { TxSettlementTime } from '@aztec/sdk';
import { useRollupProviderStatus } from 'alt-model';
import { DefiRecipe } from 'alt-model/defi/types';
import { InformationSection } from '../information_section';
import { useDefaultCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import style from './settlement_time_information_section.module.scss';

interface SettlementTimeInformationSectionProps {
  timeStr: string;
  remainingSlots: number;
  progress: number;
}

interface RecipeSettlementTimeInformationSectionProps {
  recipe: DefiRecipe;
}

interface TransactionSettlementTimeInformationSectionProps {
  selectedSpeed: TxSettlementTime;
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
  return (
    <InformationSection
      title="Est Settlement"
      subtitle={props.timeStr}
      content={<SettlementProgressBar remainingSlots={props.remainingSlots} progress={props.progress} />}
      buttonLabel="Learn more"
      // TODO: Update FAQ with more useful info about settlement times
      helpLink="https://aztec-protocol.gitbook.io/zk-money/faq/faq-rollup"
    />
  );
}

export function RecipeSettlementTimeInformationSection(props: RecipeSettlementTimeInformationSectionProps) {
  const data = useDefaultCountDownData(props.recipe);
  const progress = (data?.takenSlots ?? 0) / (data?.totalSlots ?? 1);
  const remainingSlots = (data?.totalSlots ?? 0) - (data?.takenSlots ?? 0);
  const timeStr = data?.nextBatch ? moment(data.nextBatch).fromNow(false) : '';
  return <SettlementTimeInformationSection remainingSlots={remainingSlots} progress={progress} timeStr={timeStr} />;
}

export function TransactionSettlementTimeInformationSection(props: TransactionSettlementTimeInformationSectionProps) {
  const rpStatus = useRollupProviderStatus();
  const takenSlots = rpStatus?.pendingTxCount || 0;
  // const totalSlots = 0; --> needs implementation
  // const progress = takenSlots / totalSlots;
  // const remainingSlots = totalSlots - takenSlots;
  const timeStr =
    props.selectedSpeed === TxSettlementTime.INSTANT ? 'Now' : moment(rpStatus?.nextPublishTime).fromNow(false);
  return <SettlementTimeInformationSection remainingSlots={0} progress={0} timeStr={timeStr} />;
}
