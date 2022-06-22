import { CardWrapper } from 'ui-components';
import { Button } from '../button';
import style from './shield_more.module.scss';

interface ShieldMoreProps {
  onOpenShieldModal(): void;
}

export function ShieldMore(props: ShieldMoreProps) {
  return (
    <>
      <CardWrapper className={style.shieldMoreWrapper}>
        <div>Shield additional funds from L1</div>
        <div className={style.modalAnchor}>
          <Button className={style.shieldMoreButton} text="Shield more" onClick={props.onOpenShieldModal} />
        </div>
      </CardWrapper>
    </>
  );
}
