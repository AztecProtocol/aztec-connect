import { BridgeCallData, DefiSettlementTime, TxSettlementTime } from '@aztec/sdk';
import { ProgressBar } from '../../../../../../ui-components/index.js';
import { useRollupProviderStatus } from '../../../../../../alt-model/index.js';
import { InformationSection } from '../information_section/index.js';
import { DefiGasSaving } from '../../defi_modal/defi_gas_saving.js';
import { Amount } from '../../../../../../alt-model/assets/amount.js';
import { useDefiBatchData } from '../../../../../../features/defi/bridge_count_down/bridge_count_down_hooks.js';
import style from './settlement_time_information_section.module.scss';

interface SettlementTimeInformationSectionProps {
  remainingSlots: number;
  bridgeCallData?: BridgeCallData;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  progress: number;
  speed: DefiSettlementTime;
}

interface RecipeSettlementTimeInformationSectionProps {
  bridgeCallData?: BridgeCallData;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  selectedSpeed: DefiSettlementTime;
}

interface TransactionSettlementTimeInformationSectionProps {
  selectedSpeed: TxSettlementTime;
}

interface SettlementProgressBarProps {
  remainingSlots: number;
  progress: number;
  bridgeCallData?: BridgeCallData;
  feeAmounts?: (Amount | undefined)[] | undefined[];
  speed: DefiSettlementTime;
}

function SettlementProgressBar(props: SettlementProgressBarProps) {
  const fastTrackEnabled = props.speed === DefiSettlementTime.DEADLINE && props.remainingSlots === 0;
  const batched = props.speed === DefiSettlementTime.DEADLINE && props.remainingSlots > 0;
  const instant = props.speed === DefiSettlementTime.INSTANT && props.remainingSlots >= 0;
  const fastTrack = props.speed === DefiSettlementTime.NEXT_ROLLUP && props.remainingSlots >= 0;
  return (
    <div className={style.settlementWrapper}>
      {instant && <div className={style.title}>Congrats, you're paying for the entire rollup 🐳 🎉</div>}
      {fastTrack && <div className={style.title}>Congrats, you're paying for the full batch. 🐳 🎉</div>}
      {batched && <div className={style.title}>{props.remainingSlots} slots remaining until batch</div>}
      {fastTrackEnabled && <div className={style.title}>🚀 🎉 Fast Track enabled! 🚀 🎉</div>}
      <ProgressBar className={style.bar} progress={props.progress} />
      {props.progress === 1 && <div className={style.text}>You're getting faster settlement as a result.</div>}
      <DefiGasSaving
        feeAmount={props.feeAmounts?.[props.speed]}
        bridgeAddressId={props.bridgeCallData?.bridgeAddressId}
      />
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
      content={
        <SettlementProgressBar
          feeAmounts={props.feeAmounts}
          bridgeCallData={props.bridgeCallData}
          speed={props.speed}
          remainingSlots={props.remainingSlots}
          progress={props.progress}
        />
      }
      buttonLabel="Learn more"
      helpLink="https://docs.aztec.network/zk-money/fees"
    />
  );
}

export function RecipeSettlementTimeInformationSection(props: RecipeSettlementTimeInformationSectionProps) {
  const data = useDefiBatchData(props.bridgeCallData);
  if (!data) return <></>;
  const { totalSlots } = data;
  const takenSlots = props.selectedSpeed === DefiSettlementTime.DEADLINE ? data.takenSlots : totalSlots;
  const progress = takenSlots / totalSlots;
  const remainingSlots = totalSlots - takenSlots;
  return (
    <SettlementTimeInformationSection
      feeAmounts={props.feeAmounts}
      bridgeCallData={props.bridgeCallData}
      speed={props.selectedSpeed}
      remainingSlots={remainingSlots}
      progress={progress}
    />
  );
}

export function TransactionSettlementTimeInformationSection(props: TransactionSettlementTimeInformationSectionProps) {
  const rpStatus = useRollupProviderStatus();
  if (!rpStatus) return <></>;
  const totalSlots = rpStatus.numTxsPerRollup;
  const takenSlots = props.selectedSpeed === TxSettlementTime.INSTANT ? totalSlots : rpStatus.pendingTxCount;
  const progress = takenSlots / totalSlots;
  const remainingSlots = totalSlots - takenSlots;
  const transformedSpeed =
    props.selectedSpeed === TxSettlementTime.INSTANT ? DefiSettlementTime.INSTANT : DefiSettlementTime.DEADLINE;
  return (
    <SettlementTimeInformationSection
      speed={transformedSpeed as unknown as DefiSettlementTime}
      remainingSlots={remainingSlots}
      progress={progress}
    />
  );
}
