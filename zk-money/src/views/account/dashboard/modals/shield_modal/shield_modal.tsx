import { useState, useEffect } from 'react';
import { Card, CardHeaderSize } from 'ui-components';
import { useShieldForm } from 'alt-model/shield/shield_form_hooks';
import { CloseButtonWhite, Modal } from 'components';
import { ShieldPage2 } from './shield_page2/shield_page2';
import { ShieldPage1 } from './shield_page1';
import { DropdownOption } from 'components/dropdown';
import { RemoteAsset } from 'alt-model/types';
import { useRemoteAssets } from 'alt-model/top_level_context';
import style from './shield_modal.module.scss';

interface ShieldModalProps {
  onClose: () => void;
}

export function ShieldModal(props: ShieldModalProps) {
  const assets = useRemoteAssets();
  const [assetForShielding, setAssetForShielding] = useState<RemoteAsset>();
  const { onClose } = props;
  const { fields, setters, validationResult, composerState, locked, attemptLock, feedback, submit, unlock } =
    useShieldForm();

  useEffect(() => {
    // sets first asset as default
    if (!assetForShielding && assets) {
      setAssetForShielding(assets[0]);
    }
  }, [assets]);

  if (!assets) {
    return <div />;
  }

  const handleAssetChange = (assetSymbol: DropdownOption<string>) => {
    if (!assets) {
      return;
    }
    const selectedAsset = assets.find(a => a.symbol === assetSymbol.value);
    if (selectedAsset) {
      setAssetForShielding(selectedAsset);
    }
  };

  const handleClose = () => {
    if (locked) unlock();
    else onClose();
  };

  const cardContent =
    locked && composerState ? (
      <ShieldPage2
        composerState={composerState}
        validationResult={validationResult}
        onSubmit={submit}
        onClose={onClose}
      />
    ) : (
      <ShieldPage1
        fields={fields}
        feedback={feedback}
        asset={assetForShielding}
        assets={assets}
        validationResult={validationResult}
        onNext={attemptLock}
        onChangeAmountStr={setters.amountStr}
        onChangeAsset={handleAssetChange}
        onChangeRecipientAlias={setters.recipientAlias}
        onChangeSpeed={setters.speed}
      />
    );

  return (
    <Modal>
      <Card
        cardHeader={
          <div className={style.sendHeader}>
            <span className={style.headerLabel}>Shield</span>
            <CloseButtonWhite onClick={handleClose} />
          </div>
        }
        cardContent={<div className={style.contentWrapper}>{cardContent}</div>}
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}
