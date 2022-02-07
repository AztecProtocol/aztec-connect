import { useApp, useAssetPrice, useProviderState, useShieldForm } from '../../../alt-model';
import { assets, ShieldStatus } from '../../../app';
import { Modal } from '../../../components';
import { Theme } from '../../../styles';
import { Shield } from '../shield';

export function ShieldModal({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const { config, userSession } = useApp();
  const { formValues, shieldForm, processing } = useShieldForm(assetId);
  const generatingKey = formValues?.status.value === ShieldStatus.GENERATE_KEY;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;
  const assetPrice = useAssetPrice(assetId);
  const providerState = useProviderState();
  const canClose = !processing && !generatingKey;

  if (!formValues) return <></>;

  return (
    <Modal
      theme={theme}
      title={generatingKey ? 'Create Aztec Spending Key' : 'Shield'}
      onClose={canClose ? onClose : undefined}
    >
      <Shield
        theme={theme}
        asset={assets[assetId]}
        assetPrice={assetPrice ?? 0n}
        txAmountLimit={config.txAmountLimits[assetId]}
        providerState={providerState}
        form={formValues}
        explorerUrl={config.explorerUrl}
        onChangeInputs={values => shieldForm?.changeValues(values)}
        onValidate={() => shieldForm?.lock()}
        onChangeWallet={walletId => userSession?.changeWallet(walletId)}
        onDisconnectWallet={() => userSession?.disconnectWallet()}
        onGoBack={() => shieldForm?.unlock()}
        onSubmit={() => shieldForm?.submit()}
        onClose={() => {
          if (canClose) onClose();
        }}
      />
    </Modal>
  );
}
