import { useState } from 'react';
import { bindStyle } from 'ui-components/util/classnames';
import { Tooltip } from 'ui-components';
import style from './interactive_tooltip.module.scss';

const cx = bindStyle(style);

interface InteractiveTooltipProps {
  className?: string;
  content: React.ReactNode;
}

export function InteractiveTooltip({ className, content }: InteractiveTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const toggle = () => {
    setShowTooltip(!showTooltip);
  };

  return (
    <div className={style.infoWrapper}>
      {showTooltip && <Tooltip content={content} />}
      <div>
        <div onClick={toggle} className={cx(style.infoTooltip, className, showTooltip == true && style.closeTooltip)} />
      </div>
    </div>
  );
}
