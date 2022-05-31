import { ProgressBar } from 'ui-components';
import { DefiSettlementTime, TxSettlementTime } from '@aztec/sdk';
import { useRollupProviderStatus } from 'alt-model';
import { DefiRecipe } from 'alt-model/defi/types';
import { InformationSection } from '../information_section';
import { useDefaultCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import style from './settlement_time_information_section.module.scss';

interface SettlementTimeInformationSectionProps {
  remainingSlots: number;
  progress: number;
}

interface RecipeSettlementTimeInformationSectionProps {
  recipe: DefiRecipe;
  selectedSpeed: DefiSettlementTime;
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
      {props.progress === 1 && <div className={style.title}>Congrats, you're paying for the full batch. 🎉</div>}
      {props.progress !== 1 && <div className={style.title}>{props.remainingSlots} slots remaining until batch</div>}
      <ProgressBar className={style.bar} progress={props.progress} />
      {props.progress === 1 && <div className={style.text}>You're getting faster settlement as a result.</div>}
      {props.progress !== 1 && (
        <div className={style.text}>Pay a Fast Track or Instant fee to send the batch more quickly.</div>
      )}
    </div>
  );
}

export function SettlementTimeInformationSection(props: SettlementTimeInformationSectionProps) {
  return (
    <InformationSection
      title="Batch"
      content={<SettlementProgressBar remainingSlots={props.remainingSlots} progress={props.progress} />}
      buttonLabel="Learn more"
      // TODO: Update FAQ with more useful info about settlement times
      helpLink="https://aztec-protocol.gitbook.io/zk-money/faq/faq-rollup"
    />
  );
}

export function RecipeSettlementTimeInformationSection(props: RecipeSettlementTimeInformationSectionProps) {
  const data = useDefaultCountDownData(props.recipe);
  if (!data) return <></>;
  const { totalSlots } = data;
  const takenSlots = props.selectedSpeed === DefiSettlementTime.DEADLINE ? data.takenSlots : totalSlots;
  const progress = takenSlots / totalSlots;
  const remainingSlots = totalSlots - takenSlots;
  return <SettlementTimeInformationSection remainingSlots={remainingSlots} progress={progress} />;
}

export function TransactionSettlementTimeInformationSection(props: TransactionSettlementTimeInformationSectionProps) {
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return <></>;
  const totalSlots = rpStatus.numTxsPerRollup;
  const takenSlots = props.selectedSpeed === TxSettlementTime.INSTANT ? totalSlots : rpStatus.numTxsInNextRollup;
  const progress = takenSlots / totalSlots;
  const remainingSlots = totalSlots - takenSlots;
  return <SettlementTimeInformationSection remainingSlots={remainingSlots} progress={progress} />;
}
