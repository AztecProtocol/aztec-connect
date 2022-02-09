import { bindStyle } from 'ui-components/util/classnames';
import style from './bridge_key_stats.module.css';

const cx = bindStyle(style);

function Item(props: { label: string; value: string }) {
  return (
    <div className={style.item}>
      <div className={style.label}>{props.label}</div>
      <div className={style.value}>{props.value}</div>
    </div>
  );
}

interface BridgeKeyStatsProps {
  compact?: boolean;
}

export function BridgeKeyStats({ compact }: BridgeKeyStatsProps) {
  // TODO: fetch stats from bridge adaptor
  return (
    <div className={cx(style.root, { compact })}>
      <Item label="Current yield" value="4.56%" />
      <Item label="L1 liquidity" value="$10Bn" />
      <Item label="Batch size" value="$150k" />
    </div>
  );
}
