import { useApp, useAssetPrice, useProviderState, useSendForm } from '../../../alt-model';
import { assets, SendStatus } from '../../../app';
import { Modal } from '../../../components';
import { Theme } from '../../../styles';
import { SendLayout } from '../send_layout';

export function SendModal({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const { config, userSession } = useApp();
  const { formValues, sendForm, processing, spendableBalance } = useSendForm(assetId);
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
      <SendLayout
        theme={theme}
        asset={assets[assetId]}
        assetPrice={assetPrice ?? 0n}
        txAmountLimit={config.txAmountLimits[assetId]}
        spendableBalance={spendableBalance}
        providerState={providerState}
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
    </Modal>
  );
}
