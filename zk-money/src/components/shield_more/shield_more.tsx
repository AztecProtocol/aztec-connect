import { CardWrapper } from 'ui-components';
import { useState } from 'react';
import styled from 'styled-components/macro';
import { ShieldModal } from '../../views/account/dashboard/shield_modal';
import { Button } from '../button';
import { Dropdown } from '../dropdown';

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

const DROPDOWN_OPTIONS = [
  { value: 0, label: 'ETH' },
  { value: 1, label: 'DAI' },
  { value: 2, label: 'renBTC' },
];

export function ShieldMore() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [assetIdForShielding, setAssetIdForShielding] = useState<number>();
  return (
    <>
      <ShieldMoreWrapper>
        <div>Shield more funds from your L1 wallet for privacy and gas savings!</div>
        <ModalAnchor>
          <ShieldMoreButton text="Shield more" onClick={() => setIsDropdownOpen(true)} />
          <Dropdown
            isOpen={isDropdownOpen}
            options={DROPDOWN_OPTIONS}
            onClick={({ value }) => {
              setAssetIdForShielding(value);
              setIsDropdownOpen(false);
            }}
            onClose={() => setIsDropdownOpen(false)}
          />
        </ModalAnchor>
      </ShieldMoreWrapper>
      {assetIdForShielding !== undefined && (
        <ShieldModal assetId={assetIdForShielding} onClose={() => setAssetIdForShielding(undefined)} />
      )}
    </>
  );
}
