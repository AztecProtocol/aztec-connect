import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import type { RemoteAsset } from 'alt-model/types';
import { Card, CardHeaderSize } from 'ui-components';
import { useApp, useAssetPrice, useProviderState, useSendForm } from 'alt-model';
import { SendMode, SendStatus } from 'app';
import { CloseButtonWhite, Modal } from 'components';
import { Theme } from 'styles';
import { SendLayout } from './send_layout';
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
  const { config, userSession } = useApp();
  const { formValues, sendForm, processing, spendableBalance } = useSendForm(asset, sendMode);
  const generatingKey = formValues?.status.value === SendStatus.GENERATE_KEY;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;
  const assetPrice = useAssetPrice(asset.id);
  const providerState = useProviderState();
  const canClose = !processing && !generatingKey;
  const overrideModalLayout = !generatingKey;

  if (!formValues || !asset) return <></>;

  const assetAddressStr = asset.address.toString();
  if (!isKnownAssetAddressString(assetAddressStr)) {
    throw new Error(`Attempting SendModal with unknown asset address '${assetAddressStr}'`);
  }
  const txAmountLimit = config.txAmountLimits[assetAddressStr];

  return (
    <Modal
      theme={theme}
      onClose={canClose && !overrideModalLayout ? onClose : undefined}
      noPadding={overrideModalLayout}
    >
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
          <SendLayout
            theme={theme}
            asset={asset}
            assetPrice={assetPrice ?? 0n}
            txAmountLimit={txAmountLimit}
            spendableBalance={spendableBalance}
            providerState={providerState}
            sendMode={sendMode}
            form={formValues}
            explorerUrl={config.explorerUrl}
            onChangeInputs={values => {
              sendForm?.changeValues(values);
              // sendForm?.softValidation();
            }}
            onValidate={() => sendForm?.lock()}
            onChangeWallet={walletId => userSession?.changeWallet(walletId)}
            onDisconnectWallet={() => userSession?.disconnectWallet()}
            onGoBack={() => sendForm?.unlock()}
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
