import type { Signer } from '@ethersproject/abstract-signer';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../../ui-components/index.js';
import { useAccount, useSigner } from 'wagmi';
import style from './signer_submit.module.css';

export function SignerSubmit(props: { onSubmitSigner: (signer: Signer) => void }) {
  const { data: signer } = useSigner();
  const { isConnected } = useAccount();
  const disabled = !isConnected || !signer;
  const handleClick = () => {
    if (!disabled) props.onSubmitSigner(signer);
  };
  return (
    <div className={style.root}>
      <ConnectButton accountStatus="address" showBalance={false} />
      <Button onClick={handleClick} disabled={disabled} text={'Submit'} />
    </div>
  );
}
