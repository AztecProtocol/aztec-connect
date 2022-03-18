import type { RemoteAsset } from 'alt-model/types';
import { CardWrapper } from 'ui-components';
import { useState, useMemo } from 'react';
import styled from 'styled-components/macro';
import { ShieldModal } from 'views/account/dashboard/modals/shield_modal';
import { Button } from '../button';
import { Dropdown } from '../dropdown';
import { useRemoteAssets } from 'alt-model/top_level_context';
import { KNOWN_MAINNET_ASSET_ADDRESSES as KMAA } from 'alt-model/known_assets/known_asset_addresses';

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

const SUPPORTED_FOR_SHIELDING = [KMAA.ETH, KMAA.DAI, KMAA.renBTC];

export function ShieldMore() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [assetForShielding, setAssetForShielding] = useState<RemoteAsset>();
  const assets = useRemoteAssets();
  const options = useMemo(
    () =>
      assets
        ?.filter(x => SUPPORTED_FOR_SHIELDING.some(addr => x.address.equals(addr)))
        .map(x => ({ value: x.id, label: x.symbol })),
    [assets],
  );
  return (
    <>
      <ShieldMoreWrapper>
        <div>Shield more funds from your L1 wallet for privacy and gas savings!</div>
        <ModalAnchor>
          <ShieldMoreButton text="Shield more" onClick={() => setIsDropdownOpen(true)} />
          <Dropdown
            isOpen={isDropdownOpen}
            options={options ?? []}
            onClick={({ value }) => {
              setAssetForShielding(assets?.find(x => x.id === value));
              setIsDropdownOpen(false);
            }}
            onClose={() => setIsDropdownOpen(false)}
          />
        </ModalAnchor>
      </ShieldMoreWrapper>
      {assetForShielding !== undefined && (
        <ShieldModal preselectedAssetId={assetForShielding.id} onClose={() => setAssetForShielding(undefined)} />
      )}
    </>
  );
}
