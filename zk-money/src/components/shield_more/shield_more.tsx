import { CardWrapper } from 'ui-components';
import { useState } from 'react';
import { ShieldModal } from 'views/account/dashboard/modals/shield_modal';
import { Button } from '../button';
import style from './shield_more.module.scss';
import { SelfDismissingIncentiveModal } from 'views/account/dashboard/modals/incentive_modal';

export function ShieldMore() {
  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);

  return (
    <>
      <CardWrapper className={style.shieldMoreWrapper}>
        <div>Shield additional funds from L1</div>
        <div className={style.modalAnchor}>
          <Button className={style.shieldMoreButton} text="Shield more" onClick={() => setIsShieldModalOpen(true)} />
        </div>
      </CardWrapper>
      {isShieldModalOpen && <ShieldModal onClose={() => setIsShieldModalOpen(false)} />}
      <SelfDismissingIncentiveModal instanceName="shield_more" onShieldNow={() => setIsShieldModalOpen(true)} />
    </>
  );
}
