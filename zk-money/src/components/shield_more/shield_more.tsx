import { CardWrapper } from 'ui-components';
import { useState } from 'react';
import { ShieldModal } from 'views/account/dashboard/modals/shield_modal';
import { Button } from '../button';
import styled from 'styled-components/macro';

const ShieldMoreWrapper = styled(CardWrapper)`
  display: flex;
  letter-spacing: 0.03em;
  flex-basis: 33%;
  padding: 30px;
  line-height: 150%;
  overflow: initial;
`;

const ShieldMoreButton = styled(Button)`
  margin-top: 30px;
`;

const ModalAnchor = styled.div`
  position: relative;
`;

export function ShieldMore() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <>
      <ShieldMoreWrapper>
        <div>Shield more funds from your L1 wallet for privacy and gas savings!</div>
        <ModalAnchor>
          <ShieldMoreButton text="Shield more" onClick={() => setIsDropdownOpen(true)} />
        </ModalAnchor>
      </ShieldMoreWrapper>
      {isDropdownOpen && <ShieldModal onClose={() => setIsDropdownOpen(false)} />}
    </>
  );
}
