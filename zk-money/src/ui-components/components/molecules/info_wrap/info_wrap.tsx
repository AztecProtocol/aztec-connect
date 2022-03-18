import { CloseMiniButton } from '../../inputs/icon_buttons';
import { VerticalScrollRegion } from '../vertical_scroll_region';
import style from './info_wrap.module.css';

interface InfoLayerProps {
  children: React.ReactNode;
  showingInfo: boolean;
  infoHeader: React.ReactNode;
  infoContent: React.ReactNode;
  onHideInfo: () => void;
  // border-adius is provided as a work around for infoLayer's filter blur not
  // respecting its parent's overflow constraints.
  borderRadius?: string | number;
}

export function InfoWrap({ children, showingInfo, infoHeader, infoContent, onHideInfo, borderRadius }: InfoLayerProps) {
  return (
    <div className={style.root}>
      {children}
      {showingInfo && (
        <>
          <div className={style.infoLayer} style={{ borderRadius }}>
            <div className={style.header}>
              {infoHeader}
              <CloseMiniButton onClick={onHideInfo} />
            </div>
            <div className={style.scroll}>
              <VerticalScrollRegion>
                <div className={style.content}>{infoContent}</div>
              </VerticalScrollRegion>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
