import { DeFiCardProgress } from 'components/defi_card/defi_card_content/defi_card_progress';
import style from './defi_info_banner.module.css';

interface DefiInfoBannerProps {
  imgSrc: string;
  longDesc: string;
}

export function DefiInfoBanner(props: DefiInfoBannerProps) {
  return (
    <>
      <div className={style.upper}>
        <img className={style.img} src={props.imgSrc} />
        <DeFiCardProgress />
      </div>
      <div className={style.description}>{props.longDesc}</div>
    </>
  );
}
