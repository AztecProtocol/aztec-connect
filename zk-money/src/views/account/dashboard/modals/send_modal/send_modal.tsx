import { useMemo } from 'react';
import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import type { RemoteAsset } from 'alt-model/types';
import { Card, CardHeaderSize } from 'ui-components';
import { debounce } from 'lodash';
import { useApp, useSendForm } from 'alt-model';
import { SendMode, SendStatus } from 'app';
import { CloseButtonWhite, Modal } from 'components';
import { Theme } from 'styles';
import { Send } from './send';
import style from './send_modal.module.scss';

interface SendModalProps {
  onClose: () => void;
  asset: RemoteAsset;
  sendMode?: SendMode;
}

function getTitle(sendMode: SendMode) {
  switch (sendMode) {
    case SendMode.SEND:
      return 'Send to L2';
    case SendMode.WIDTHDRAW:
      return 'Withdraw to L1';
    default:
      return '';
  }
}

export function SendModal({ asset, onClose, sendMode = SendMode.SEND }: SendModalProps) {
  const { config } = useApp();
  const { formValues, sendForm, processing, spendableBalance } = useSendForm(asset, sendMode);
  const generatingKey = formValues?.status.value === SendStatus.GENERATE_KEY;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;
  const canClose = !processing && !generatingKey;
  const overrideModalLayout = !generatingKey;
  const debouncedSoftValidation = useMemo(() => debounce(() => sendForm?.softValidation(), 300), [sendForm]);

  if (!formValues || !asset) return <></>;

  const assetAddressStr = asset.address.toString();
  if (!isKnownAssetAddressString(assetAddressStr)) {
    throw new Error(`Attempting SendModal with unknown asset address '${assetAddressStr}'`);
  }
  const txAmountLimit = config.txAmountLimits[assetAddressStr];

  return (
    <Modal theme={theme} onClose={() => canClose && onClose()} noPadding={overrideModalLayout}>
      <Card
        cardHeader={
          <div className={style.sendHeader}>
            <span className={style.headerLabel}>{getTitle(sendMode)}</span>
            <CloseButtonWhite
              onClick={() => {
                if (canClose) onClose();
              }}
            />
          </div>
        }
        cardContent={
          <Send
            theme={theme}
            asset={asset}
            txAmountLimit={txAmountLimit}
            spendableBalance={spendableBalance}
            sendMode={sendMode}
            form={formValues}
            explorerUrl={config.explorerUrl}
            onChangeInputs={async values => {
              sendForm?.changeValues(values);
              debouncedSoftValidation();
            }}
            onValidate={() => sendForm?.lock()}
            onSubmit={() => sendForm?.submit()}
            onClose={() => {
              if (canClose) onClose();
            }}
          />
        }
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}
