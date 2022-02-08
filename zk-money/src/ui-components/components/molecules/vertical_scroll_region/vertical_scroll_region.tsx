import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  VerticalScrollBar,
  VerticalScrollBarHandle,
} from 'ui-components/components/atoms/vertical_scroll_bar/vertical_scroll_bar';
import style from './vertical_scroll_region.module.css';

export function VerticalScrollRegion(props: { children?: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<VerticalScrollBarHandle>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewHeight, setViewHeight] = useState(0);
  useEffect(() => {
    requestAnimationFrame(() => {
      setContentHeight(contentRef.current?.offsetHeight ?? 0);
      setViewHeight(rootRef.current?.offsetHeight ?? 0);
    });
  }, []);
  const handleScrollTo = useCallback((scrollTop: number) => {
    const elem = scrollRef.current;
    if (elem) elem.scrollTop = scrollTop;
  }, []);
  const handleScroll = () => {
    barRef.current?.setScroll(scrollRef.current?.scrollTop ?? 0);
  };
  return (
    <div className={style.root} ref={rootRef}>
      <div className={style.content} ref={scrollRef} onScroll={handleScroll}>
        <div ref={contentRef}>{props.children}</div>
      </div>
      <VerticalScrollBar ref={barRef} viewHeight={viewHeight} contentHeight={contentHeight} onDragTo={handleScrollTo} />
    </div>
  );
}
