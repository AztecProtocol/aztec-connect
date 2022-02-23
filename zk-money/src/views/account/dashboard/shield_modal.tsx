import { Card, CardHeaderSize } from 'ui-components';
import { useApp, useAssetPrice, useProviderState, useShieldForm } from '../../../alt-model';
import { assets, ShieldStatus } from '../../../app';
import { CloseButtonWhite, Modal } from '../../../components';
import { Theme } from '../../../styles';
import { Shield } from '../shield';
import style from './shield_modal.module.scss';

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
    <Modal>
      <Card
        cardHeader={
          <div className={style.sendHeader}>
            <span className={style.headerLabel}>{generatingKey ? 'Create Aztec Spending Key' : 'Shield'}</span>
            <CloseButtonWhite onClick={onClose} />
          </div>
        }
        cardContent={
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
        }
        headerSize={CardHeaderSize.LARGE}
      />
    </Modal>
  );
}
