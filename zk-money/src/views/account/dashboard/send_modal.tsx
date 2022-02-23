import { Card, CardHeaderSize } from 'ui-components';
import { useApp, useAssetPrice, useProviderState, useSendForm } from '../../../alt-model';
import { assets, SendMode, SendStatus } from '../../../app';
import { CloseButtonWhite, Modal } from '../../../components';
import { Theme } from '../../../styles';
import { SendLayout } from '../send_layout';
import style from './send_modal.module.scss';

interface SendModalProps {
  onClose: () => void;
  assetId: number;
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

export function SendModal({ assetId, onClose, sendMode = SendMode.SEND }: SendModalProps) {
  const { config, userSession } = useApp();
  const { formValues, sendForm, processing, spendableBalance } = useSendForm(assetId, sendMode);
  const generatingKey = formValues?.status.value === SendStatus.GENERATE_KEY;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;
  const assetPrice = useAssetPrice(assetId);
  const providerState = useProviderState();
  const canClose = !processing && !generatingKey;
  const overrideModalLayout = !generatingKey;

  if (!formValues) return <></>;

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
            asset={assets[assetId]}
            assetPrice={assetPrice ?? 0n}
            txAmountLimit={config.txAmountLimits[assetId]}
            spendableBalance={spendableBalance}
            providerState={providerState}
            sendMode={sendMode}
            form={formValues}
            explorerUrl={config.explorerUrl}
            onChangeInputs={values => sendForm?.changeValues(values)}
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
