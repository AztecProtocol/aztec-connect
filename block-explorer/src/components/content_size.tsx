import React, { useState, useEffect, useRef } from 'react';

interface ContentSizeChildrenProps {
  width: number;
  height: number;
}

interface ContentSizeProps {
  className?: string;
  children: (props: ContentSizeChildrenProps) => JSX.Element;
}

export const ContentSize: React.FunctionComponent<ContentSizeProps> = ({ className, children }) => {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const { width, height } = containerRef.current?.getBoundingClientRect() || {};
      setWidth(width || 0);
      setHeight(height || 0);
    };

    if (containerRef) {
      window.addEventListener('resize', handleResize, true);
      handleResize();
    }

    return () => {
      window.removeEventListener('resize', handleResize, true);
    };
  }, [containerRef]);

  return (
    <div ref={containerRef} className={className}>
      {children({ width, height })}
    </div>
  );
};
