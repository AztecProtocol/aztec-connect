import { EthAddress, EthereumProvider, EthersAdapter } from '@aztec/sdk';
import { useEffect, useMemo, useRef } from 'react';
import { useAccount, useNetwork, useSigner } from 'wagmi';
import { Obs, ChainableInputObs } from '../app/util/index.js';

export function useActiveWalletEthAddress() {
  const { address, isConnected } = useAccount();
  const ethAddress = useMemo(() => {
    if (!isConnected || !address) return;
    return EthAddress.fromString(address);
  }, [address, isConnected]);
  return ethAddress;
}

export function useActiveWalletEthSigner() {
  const ethAddress = useActiveWalletEthAddress();
  const { data: ethersSigner } = useSigner();
  const ethSigner: EthereumProvider | undefined = useMemo(() => {
    // We check for a connected address so we know the signer isn't a fallback provider
    if (ethAddress && ethersSigner) {
      return new EthersAdapter(ethersSigner.provider!);
    }
  }, [ethAddress, ethersSigner]);
  return { ethAddress, ethSigner };
}

export type ActiveChainIdObs = Obs<number | undefined>;

export function useActiveChainIdObs(): ActiveChainIdObs {
  const { chain } = useNetwork();
  const chainId = chain?.id;
  const obsRef = useRef<ChainableInputObs<number | undefined>>();
  if (!obsRef.current) obsRef.current = Obs.input(chainId);
  const obs = obsRef.current;
  useEffect(() => obs.next(chainId), [obs, chainId]);
  return obs;
}
