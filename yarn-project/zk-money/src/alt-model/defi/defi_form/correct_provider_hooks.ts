import type { Signer } from '@ethersproject/abstract-signer';
import { useEffect, useRef } from 'react';
import { useSigner, useAccount } from 'wagmi';
import { EthAddress } from '@aztec/sdk';
import { Semaphore, Obs, ChainableInputObs } from '../../../app/util/index.js';
import { useAccountState } from '../../account_state/account_state_hooks.js';

export function useAwaitCorrectProvider() {
  const accountState = useAccountState();
  const { data: signer } = useSigner();
  const { address } = useAccount();

  const ref = useRef<Semaphore<Signer>>();
  if (!ref.current) ref.current = new Semaphore();
  useEffect(() => {
    if (!address || !accountState?.ethAddressUsedForAccountKey) {
      return;
    }
    const ethAddress = EthAddress.fromString(address);
    if (ethAddress.equals(accountState.ethAddressUsedForAccountKey) && signer) {
      ref.current?.open(signer);
    } else {
      ref.current?.close();
    }
  }, [address, signer, accountState?.ethAddressUsedForAccountKey]);
  return ref.current.wait;
}

export type ActiveSignerObs = Obs<Signer | undefined | null>;

export function useActiveSignerObs(): ActiveSignerObs {
  const { data: signer } = useSigner();
  const obsRef = useRef<ChainableInputObs<Signer | undefined | null>>();
  if (!obsRef.current) obsRef.current = Obs.input(signer);
  const obs = obsRef.current;
  useEffect(() => obs.next(signer), [obs, signer]);
  return obs;
}
