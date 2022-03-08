import { BridgeCountDown } from 'features/defi/bridge_count_down';
import style from './defi_info_banner.module.css';

interface DefiInfoBannerProps {
  imgSrc: string;
  longDescription: string;
}

export function DefiInfoBanner(props: DefiInfoBannerProps) {
  return (
    <>
      <div className={style.upper}>
        <img className={style.img} src={props.imgSrc} />
        <BridgeCountDown nextBatch={new Date(Date.now() + 1000 * 60 * 60)} takenSlots={10} totalSlots={12} />
      </div>
      <div className={style.description}>{props.longDescription}</div>
    </>
  );
}
