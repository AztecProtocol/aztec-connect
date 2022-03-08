import { GradientSelectBox } from 'ui-components';
import styled from 'styled-components/macro';
import { useApp } from 'alt-model';
import { WalletId, wallets } from 'app';
import { Select } from 'components';

const PlaceHolder = styled.div`
  color: #aaa;
  margin-left: 20px;
`;

const ITEMS = (window.ethereum ? wallets : wallets.filter(w => w.id !== WalletId.METAMASK))
  .filter(w => w.id !== WalletId.HOT)
  .map(wallet => ({
    id: wallet.id,
    content: wallet.nameShort,
  }));

export function WalletDropdownSelect() {
  const { userSession } = useApp();
  return (
    <Select
      items={ITEMS}
      onSelect={id => userSession?.changeWallet(id)}
      trigger={
        <GradientSelectBox>
          <PlaceHolder>Connect a wallet</PlaceHolder>
        </GradientSelectBox>
      }
    />
  );
}
