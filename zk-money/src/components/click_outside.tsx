import React, { useEffect, useRef } from 'react';

interface ClickOutsideProps {
  className?: string;
  onClickOutside(): void;
  disabled?: boolean;
}

export const ClickOutside: React.FunctionComponent<ClickOutsideProps> = ({
  className,
  children,
  onClickOutside,
  disabled,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref?.current?.contains(e.target as any)) {
        return;
      }

      e.stopPropagation();
      onClickOutside();
    };

    document.addEventListener('click', handleClickOutside, true);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [disabled]);

  return (
    <div className={className} ref={ref}>
      {children}
    </div>
  );
};
