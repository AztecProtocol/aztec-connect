import idiosyncraticAmount from 'images/idiosyncratic_amount.svg';
import sameWallet from 'images/same_wallet.svg';
import visibleOnChain from 'images/visible_on_chain.svg';
import style from './shield_privacy_section.module.css';

export function ShieldPrivacySection() {
  return (
    <div className={style.root}>
      <div className={style.content}>
        <img src={idiosyncraticAmount} alt="" />
        <div>Do not shield idiosyncratic amounts</div>
        <img src={sameWallet} alt="" />
        <div>Do not send to the same wallet you shielded from</div>
        <img src={visibleOnChain} alt="" />
        <div>Deposits to Aztec are visible on-chain</div>
      </div>
    </div>
  );
}
