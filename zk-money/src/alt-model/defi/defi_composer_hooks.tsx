import { useEffect, useMemo, useRef, useState } from 'react';
import createDebug from 'debug';
import { DefiComposer, DefiComposerPayload } from './defi_composer';
import { useApp } from '../app_context';
import { useObs } from '../../app/util/obs';
import { AssetValue, BridgeId, DefiSettlementTime, toBaseUnits } from '@aztec/sdk';
import { Asset, fromBaseUnits, Provider } from '../../app';
import { useBalance } from '../balance_hooks';
import { DefiFormFieldAnnotations, InputAnnotation } from '../../views/account/dashboard/defi_modal/types';
import { useProviderState } from '../provider_hooks';
import { Semaphore } from '../../app/util';

const debug = createDebug('zm:defi_composer_hooks');

function useAwaitCorrectProvider() {
  const { keyVault, provider } = useApp();
  const providerState = useProviderState();
  const address = providerState?.account;
  const ref = useRef<Semaphore<Provider>>();
  if (!ref.current) ref.current = new Semaphore();
  useEffect(() => {
    if (keyVault && address?.equals(keyVault.signerAddress) && provider) {
      ref.current?.open(provider);
    } else {
      ref.current?.close();
    }
  }, [keyVault, address, provider]);
  return ref.current.wait;
}

export function useDefiComposer(bridgeId: BridgeId) {
  const composer = useMemo(() => new DefiComposer(bridgeId), [bridgeId]);
  const state = useObs(composer.stateObs);
  const { sdk, accountId, provider } = useApp();

  const awaitCorrectProvider = useAwaitCorrectProvider();
  const compose = (payload: DefiComposerPayload) => {
    if (!provider || !sdk || !accountId) {
      debug('Tried to submit to DefiComposer before deps were ready.');
      return;
    }
    composer.compose(payload, { awaitCorrectProvider, sdk, accountId });
  };

  return { ...state, compose };
}

interface DefiFormFields {
  amountStr: string;
  speed: DefiSettlementTime;
}

function useDefiFees(bridgeId: BridgeId) {
  const { sdk } = useApp();
  const [fees, setFees] = useState<AssetValue[]>();
  useEffect(() => {
    sdk?.getDefiFees(bridgeId).then(setFees);
  }, [sdk, bridgeId]);
  return fees;
}

export function useDefiForm(bridgeId: BridgeId, inputAsset: Asset, fields: DefiFormFields) {
  const balance = useBalance(inputAsset.id);
  const { config } = useApp();
  const maxAmount = config.txAmountLimits[inputAsset.id];
  const amount = toBaseUnits(fields.amountStr, inputAsset.decimals);
  const fee = useDefiFees(bridgeId)?.[fields.speed].value;
  const total = amount + (fee ?? 0n);

  const validate = () => {
    if (fee === undefined || balance === undefined) return { loading: true };
    return {
      loading: false,
      allowForGas: balance - amount < fee,
      insufficentFunds: total > balance,
      tooSmall: amount <= 0n,
      beyondMax: amount > maxAmount,
    };
  };
  const issues = validate();
  const annotateAmountStr = (): InputAnnotation | undefined => {
    if (issues.beyondMax) {
      return {
        type: 'error',
        text: `Defi deposits are currently limited to ${fromBaseUnits(maxAmount, inputAsset.decimals)} zk${
          inputAsset.symbol
        }`,
      };
    } else if (issues.insufficentFunds) {
      return {
        type: 'error',
        text: 'Insufficient funds',
      };
    } else if (issues.allowForGas) {
      return {
        type: 'error',
        text: `Please allow at least ${fromBaseUnits(fee ?? 0n, inputAsset.decimals)} zk${
          inputAsset.symbol
        } for the gas fee.`,
      };
    } else if (issues.tooSmall) {
      return {
        type: 'error',
        text: 'Please deposit a sum greater than 0',
      };
    }
  };
  const fieldAnnotations: DefiFormFieldAnnotations = {
    amountStr: annotateAmountStr(),
  };
  const invalid = Object.values(issues).some(x => x);
  return { amount, issues, invalid, fee, fieldAnnotations, maxAmount };
}
