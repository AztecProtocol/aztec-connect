import { useRef, useState } from 'react';
import { useOutsideAlerter } from '../../../../../../ui-components/components/dropdown/helpers.js';
import { bindStyle, CogIcon } from '../../../../../../ui-components/index.js';
import style from './customisation_popup.module.scss';

const cx = bindStyle(style);

interface CustomisationPopupProps {
  content: React.ReactNode;
}

export function CustomisationPopup(props: CustomisationPopupProps) {
  const [hidden, setHidden] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  useOutsideAlerter(overlayRef, () => {
    if (!hidden) setTimeout(() => setHidden(true), 100);
  });
  return (
    <div className={style.root}>
      <div className={style.button} onClick={() => setHidden(!hidden)}>
        <CogIcon />
      </div>
      {/* Note that the content is always mounted so as to preserve state when closed */}
      <div ref={overlayRef} className={cx(style.overlay, { hidden })}>
        {props.content}
      </div>
    </div>
  );
}
