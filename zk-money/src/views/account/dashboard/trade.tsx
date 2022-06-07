import underConstructionSvg from '../../../images/under_construction.svg';
import { Button } from 'components';
import style from './trade.module.scss';

export function Trade() {
  return (
    <div className={style.underConstructionWrapper}>
      <img alt="Under construction" className={style.image} src={underConstructionSvg} />
      <span className={style.title}>Under Construction</span>
      <div className={style.body}>
        Aztec Connect is initially focused on yield and staking use cases, while we increase the frequency of the
        rollup.
        <br />
        <br />
        Stay tuned for updates on when your favourite dex's will be available on zk.money.
      </div>
      <Button
        href="https://medium.com/aztec-protocol/dollars-and-sense-cheap-privacy-with-aztec-connect-f35db037a04"
        target="_blank"
        className={style.button}
      >
        Read More
      </Button>
    </div>
  );
}
