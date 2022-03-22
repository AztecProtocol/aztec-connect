import underConstructionSvg from '../../../images/under_construction.svg';
import { Button } from 'components';
import style from './trade.module.scss';

export function Trade() {
  return (
    <div className={style.underConstructionWrapper}>
      <img className={style.image} src={underConstructionSvg} />
      <span className={style.title}>Under Construction</span>
      <div className={style.body}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin varius tempus diam, vitae varius mauris pretium
        sodales. Donec molestie, sem eu ultrices venenatis, mi lacus euismod nibh, vel ultrices lectus nunc vitae nisl.{' '}
      </div>
      <Button className={style.button} theme='white'>Read More</Button>
    </div>
  );
}
