import type { DefiRecipe } from 'alt-model/defi/types';
import { useCountDownData } from 'features/defi/bridge_count_down/bridge_count_down_hooks';
import moment from 'moment';

interface DefiRollupTimingProps {
  recipe: DefiRecipe;
}

export function DefiRollupTiming({ recipe }: DefiRollupTimingProps) {
  const data = useCountDownData(recipe);
  if (!data || !data.nextBatch) return <></>;
  const timeStr = moment(data.nextBatch).fromNow(true);
  return <>This transaction will be sent in a batch in {timeStr} time.</>;
}
