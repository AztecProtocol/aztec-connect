import { Asset } from '@aztec/sdk';

import style from './input.module.scss';

interface AmountInputProps {
  asset: Asset;
}

export function Input({ asset }: AmountInputProps) {
  return (
    <div className={style.content}>
      An input
      {/* <ShieldedAssetIcon asset={asset} />
      <Input {...inputProps} onChangeValue={handleChangeValue} />
      <MaxButton>Max</MaxButton> */}
    </div>
  );
}
