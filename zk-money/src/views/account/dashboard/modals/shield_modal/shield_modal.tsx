import { isKnownAssetAddressString } from 'alt-model/known_assets/known_asset_addresses';
import { RemoteAsset } from 'alt-model/types';
import { Card, CardHeaderSize } from 'ui-components';
import { useApp, useAssetPrice, useProviderState, useShieldForm } from 'alt-model';
import { ShieldStatus } from 'app';
import { CloseButtonWhite, Modal } from 'components';
import { Theme } from 'styles';
import { Shield } from './shield';
import style from './shield_modal.module.scss';

export function ShieldModal({ asset, onClose }: { asset: RemoteAsset; onClose: () => void }) {
  const { config, userSession } = useApp();
  const { formValues, shieldForm, processing } = useShieldForm(asset);
  const generatingKey = formValues?.status.value === ShieldStatus.GENERATE_KEY;
  const theme = generatingKey ? Theme.GRADIENT : Theme.WHITE;
  const assetPrice = useAssetPrice(asset.id);
  const providerState = useProviderState();
  const canClose = !processing && !generatingKey;

  if (!formValues || !asset) return <></>;

  const assetAddressStr = asset.address.toString();
  if (!isKnownAssetAddressString(assetAddressStr)) {
    throw new Error(`Attempting SendModal with unknown asset address '${assetAddressStr}'`);
  }
  const txAmountLimit = config.txAmountLimits[assetAddressStr];

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
            asset={asset}
            assetPrice={assetPrice ?? 0n}
            txAmountLimit={txAmountLimit}
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
